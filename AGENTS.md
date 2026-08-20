# AGENTS.md — VaultGate Agent 工作指南

本文件是编码 agent（Claude Code / OpenClaw / Hermes 等）在本仓库工作的入口文档。开始任何任务前先通读本文件；实现过程中按"新场景清单"执行；交付前跑通"验证回路"。

## 1. 项目速览

VaultGate 是自托管的凭据网关：单管理员 + N 个 agent。管理员通过控制面管理密钥（Secret）、agent 令牌与访问授权；agent 通过 vault API 读取被授权的凭据。

- 后端：`apps/api/`，FastAPI + async SQLAlchemy。生产 PostgreSQL，开发 SQLite。
- 控制面：`apps/control-plane-v3/`，Next.js（App Router）+ Tailwind + shadcn 风格组件。浏览器只调用同源 `/api` 代理，不存在客户端公网 API 基址。
- 部署编排：根目录 4 份 compose（dev / prod / prod-external-db / coolify）+ `ops/`（Caddy 等）+ `tests/ops`（部署契约测试）。

三类凭据，前缀是安全边界的一部分（双向强制）：

| 前缀 | 类型 | 使用范围 |
|---|---|---|
| `vgs_` | 管理员会话 | 浏览器 Cookie，部分敏感端点仅限会话（如改密、一键吊销） |
| `vgm_` | 管理令牌 | `/api/admin/*` 的 API 管理操作 |
| `vg_` | agent 令牌 | 仅 `/api/vault/*` |

跨边界凭据一律拒绝；无授权的凭据默认读不到任何 Secret。

## 2. 仓库地图

| 路径 | 内容 |
|---|---|
| `apps/api/app/modules/{admin_auth,agents,audit,access,secrets,spaces,tokens,vault}` | 后端业务模块（路由 + 服务） |
| `apps/api/app/orm.py`、`apps/api/app/api_schemas.py` | ORM 模型 / API 响应模型 |
| `apps/api/alembic/` | 数据库迁移 |
| `apps/api/tests/`、`tests/ops/` | 后端功能测试 / 部署契约测试 |
| `apps/control-plane-v3/src/app/` | 页面路由（agents, audit, login, secrets, settings, spaces, docs, setup…） |
| `apps/control-plane-v3/src/{components,lib,i18n}` | 组件 / API 客户端与类型 / 双语消息（zh-CN、en） |
| `apps/control-plane-v3/test/e2e/` | Playwright 功能、无障碍、视觉测试与 fixtures |
| `scripts/ops/` | 验证、演练、运维脚本（verify-*、backup-*、inspect-*） |
| `docs/{guides,plans,audits,decisions}` | 运维指南 / 设计文档 / 审计记录 / 决策记录（ADR） |

## 3. 验证回路

首次环境准备：

```bash
./scripts/ops/bootstrap-dev-runtime.sh        # 创建 .venv 并安装 Python 依赖
cd apps/control-plane-v3 && npm ci
```

| 回路 | 命令 | 何时用 |
|---|---|---|
| 迭代回路 | `./scripts/ops/verify-fast.sh` | 每次代码改动后 |
| 合并回路 | `./scripts/ops/verify-control-plane.sh` | 交付/合并前必须全绿 |

- `verify-fast` = 合并回路减去浏览器测试（e2e/a11y/visual/performance）、生产构建与部署配置检查。**verify-fast 绿不等于完成**，交付前必须跑合并回路。
- pytest 自带 `--cov=app --cov-fail-under=80` 覆盖率门禁；前端 vitest 覆盖率棘轮只升不降（`vitest.config.ts` thresholds）。
- 改动了 API 形状：`cd apps/control-plane-v3 && npm run generate:api-types`（`check:api-types` 门禁会校验生成物与提交一致）。
- `npm run test:integration` 目前**不在**合并门禁内，不得用它替代 e2e。

## 4. 架构红线

违反任何一条，PR 即不合格。

| # | 红线 | 执行机制 |
|---|---|---|
| 1 | `/api/admin/*` 与 `/api/vault/*` 边界双向失败关闭：admin 侧不接受 `vg_`，vault 侧不接受 `vgs_`/`vgm_` | 现有测试（认证边界用例）+ 评审 |
| 2 | 授权判定只走 `apps/api/app/modules/access/service.py` 或资源属主校验，禁止在路由里重复实现授权逻辑 | 评审 |
| 3 | 默认拒绝：无任何 grant/成员的凭据必须读不到任何 Secret | 现有测试（outsider 断言） |
| 4 | 新审计动作必须先注册进 `modules/audit/service.py` 的 `AUDIT_ACTIONS` 元组，否则运行时 ValueError | 运行时失败 + 评审 |
| 5 | 禁止隐式 tag 授权；禁止遗留兼容路由（见 CONTRIBUTING.md） | 评审 |
| 6 | Vault 写端点强制 `Idempotency-Key` 请求头，缺失返回 422 | 现有测试 |
| 7 | 前端文案必须同时更新 `zh-CN.json` 与 `en.json` | `src/i18n/messages.test.ts` 强制 |
| 8 | API 形状变更后必须 `npm run generate:api-types` 并提交生成物 | `check:api-types` 门禁 |
| 9 | 数据库结构变更必须走 Alembic 迁移，且保留既有数据 | `scripts/ops/check_migration_policy.py` + 评审 |

## 5. 新场景清单

### 后端（新端点 / 新模块）

1. 数据模型：新表 → ORM 模型 + Alembic 迁移（保留数据，过 `check_migration_policy.py`）；枚举类字段用 CHECK 约束兜底。
2. `api_schemas.py` 增加响应模型。
3. 模块实现：授权走 access service 或属主校验；管理端变更写审计（action 先入 `AUDIT_ACTIONS`）；vault 写端点强制幂等键；整体替换类端点在 commit 处捕获 `IntegrityError` → 409 并回滚。
4. 测试（缺一不可）：
   - 认证边界：错误凭据类 401（`vg_` 打管理端、`vgm_` 打 vault、会话专属端点拒绝 Token）；
   - 授权：越权 403/404，且不泄漏资源存在性；
   - 冲突路径 409；会话 Cookie 端点补 CSRF Origin 403 断言；
   - 审计行断言（action + result + 关键 metadata）；
   - vault 写：幂等重放返回同一资源、hash 不匹配 409。
5. `./scripts/ops/verify-fast.sh` 全绿。

### 前端（新页面 / 新交互）

1. `src/app/<route>/page.tsx` + 同目录 `page.test.tsx`（mock 写法参照 settings/security 页测试）。
2. i18n：`zh-CN.json` 与 `en.json` 同步加 key（对齐测试强制）。
3. `src/lib/vaultgate-api.ts` 增加调用函数与类型，然后 `npm run generate:api-types`。
4. e2e：`test/e2e/<name>.spec.ts`，使用 `fixtures.mockSession`；**至少一条移动端断言**（如 `assertNoHorizontalOverflow` 或视口相关的可见性/布局断言）。
5. 页面进入 `test/e2e/fixtures.ts` 的 `appRoutes` 后自动获得无障碍扫描与视觉基线覆盖；新路由必须加入 `appRoutes`。含图表/复杂响应式组件的页面额外在 visual spec 中单独登记交互态截图。
6. `npm run check`（typecheck + lint + prettier）全绿。

### 部署 / 配置

1. compose / Caddyfile / 代理链改动 → 同步新增或修改 `tests/ops` 契约测试。
2. 新环境变量 → 同步全部 compose 文件（dev/prod/external-db/coolify）、`prod.env.example`（如存在）与 `docs/guides` 对应环境变量表。
3. 涉及信任边界 → 更新 `production-security.md` 与 `coolify-deployment.md` 相应小节。

### 文档

新增公开 API → 更新 README 的 API 表；新设计决策 → `docs/decisions/` 新增 ADR；安全审计 → 更新 `docs/audits/README.md` 索引。

## 6. 模式索引（要做 X，抄哪里）

| 任务 | 范本 |
|---|---|
| 新管理端模块 | `apps/api/app/modules/spaces/`（routes + schemas + 审计 + 409 并发处理） |
| 管理端端点测试 | `apps/api/tests/test_admin_api.py` 中 `test_revoke_all_tokens_*` 系列（会话/Token 认证差异、CSRF、审计行断言） |
| 并发冲突 409 测试 | `apps/api/tests/test_space_collaboration.py::test_concurrent_membership_replace_conflict_returns_409`（patch `AsyncSession.commit` 制造 IntegrityError） |
| vault 侧协作流程测试 | `apps/api/tests/test_space_collaboration.py`（幂等、角色权限、吊销即时生效） |
| 新前端页面 | `apps/control-plane-v3/src/app/settings/security/page.tsx` + `page.test.tsx`（vi.mock vaultgate-api、错误映射、危险操作确认弹窗） |
| 新 e2e | `test/e2e/security-settings.spec.ts` + `test/e2e/fixtures.ts` |
| 无障碍测试 | `test/e2e/accessibility.spec.ts`（共享 `appRoutes`） |
| 视觉基线 | `test/e2e/visual.spec.ts`（共享 `appRoutes`；基线目录 `visual.spec.ts-snapshots/` 提交入库） |
| 部署契约测试 | `tests/ops/`（XFF 契约、Caddy 转发、Coolify compose 等） |

## 7. 决策记录（ADR）

`docs/decisions/` 记录"看似可疑但实为设计"的决策。遇到与直觉相悖的行为，先查 ADR 再动手"修复"：

- ADR-001 Secret 名称全局唯一（含存在性旁路权衡）
- ADR-002 改密不连带吊销管理/agent 令牌（应急补位：一键吊销端点）
- ADR-003 Coolify 部署保留宽 `TRUSTED_PROXY_CIDRS` 默认值（收窄用 `scripts/ops/inspect-trusted-proxies.sh`）
- ADR-004 控制面 UI 为过渡版，重建在 `ui/shadcn-rebuild` 分支
- ADR-005 截图基线策略（矩阵、CI 生成、重建后统一重录）

## 8. 当前状态

控制面 UI 处于过渡期：shadcn/ui 重建在 `ui/shadcn-rebuild` 分支进行（脚手架完成，页面迁移进行中）。因此：

- 新场景前端按现行模式实现即可，不做过度视觉打磨；
- 视觉基线在 UI 重建合并后统一重录，基线 diff 审查以当前实现为准。

## 9. 文档义务

1. 代码与文档冲突时代码赢；发现陈旧文档必须在同一 PR 修正。
2. 改动环境变量 → 同步 `docs/guides` 环境变量表与相关 compose。
3. 新增公开 API → 更新 README API 表。
4. 修改红线、模式或清单 → 同一 PR 更新本文件。
5. 新设计决策 → 新增 ADR 并在本文件第 7 节登记。

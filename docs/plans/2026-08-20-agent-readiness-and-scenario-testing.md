# VaultGate Agent 协作就绪与新场景测试规范方案

日期：2026-08-20
状态：待确认
范围：agent 入口文档、新场景开发清单、测试规范（移动端/视觉/i18n）、验证回路、文档同步机制、落地路线。

## 0. 背景与问题定义

诉求：让编码 agent（Claude Code、OpenClaw、Hermes 等，下文统称 agent）在无实时人工监督下为本项目新增业务场景，并保证：

1. 能**发现**规范（入口文档）；
2. 能**模仿**正确模式（参考实现 + 清单）；
3. 能**自验证**闭环（快速回路 + 完整回路）；
4. **架构不变量**由机器门禁兜底，不依赖 agent 自觉；
5. 杜绝"移动端渲染类问题通过全部测试"这一已发生过的失败类别。

现状盘点结论（详见 2026-08-19 审计与本轮勘察）：

| 维度 | 现状 |
|---|---|
| 后端新场景 | 模式一致 + 门禁强制，正确性有保障 |
| 部署/配置 | `tests/ops` 13 个契约测试兜底，保障强 |
| 前端功能 | 类型/lint/构建/单测门禁齐全，基本保障 |
| 移动端/视觉 | 仅 `accessibility.spec.ts` 的单视口（320px）无障碍扫描；无布局/渲染断言、无截图基线；e2e 移动端 project 只重跑桌面功能断言；历史移动端渲染问题均由人工审计发现 |
| i18n 完整性 | 无 key 对齐测试，漏翻译静默退化为显示 key |
| agent 入口文档 | 无 AGENTS.md/CLAUDE.md；CONTRIBUTING 仅 17 行；架构设计文档落后于 Spaces 功能 |

## 1. 设计原则

1. **机器门禁优先于文字约定**。能用测试拦的，不写进清单靠自觉；清单只承载无法自动化的部分。
2. **让隐性知识显性化**。审计决策、架构红线、验证命令必须落到 agent 可读的文件里。
3. **把"静默通过"变成"显式差异"**。视觉/移动端正确性通过截图基线转为可审查的 diff。
4. **低成本、可废弃**。前端 UI 处于过渡期（重建中），本方案的 UI 相关投入（截图基线等）必须便宜到可以随时推倒重来。
5. **单一事实来源是代码与测试**。文档冲突时代码赢，agent 有义务在同 PR 修正文档。

## 2. 总体架构：三层防线

```
L1 发现层   AGENTS.md（入口 + 红线 + 清单 + 模式索引 + 决策索引）
              │
L2 模仿层   参考实现（后端 spaces / 前端 settings/security）
            测试模板（后端端点模板 / 前端页面模板 / e2e 模板）
              │
L3 门禁层   既有：verify-control-plane.sh（mypy/ruff/pytest 80%/ops 契约/
            check:api-types/typecheck/lint/vitest 棘轮/build/e2e/perf）+ CI 安全扫描
            新增：i18n 对齐测试 · 双视口截图基线 · 移动端断言助手 · verify-fast.sh
```

## 3. 交付物设计

### 3.1 根级 `AGENTS.md`（P0）

同时提供 `CLAUDE.md` 作为其符号链接（Claude Code 自动读取；AGENTS.md 为跨工具通用名；若某工具两者都不读，使用说明要求将其内容前置到任务提示词）。

章节结构与要点：

1. **项目速览**：一句话定位、技术栈（FastAPI+async SQLAlchemy / Next.js / PG-SQLite）、三类凭据 `vgs_`/`vgm_`/`vg_` 及边界。
2. **仓库地图**：`apps/api`（modules/orm/services）、`apps/control-plane-v3`（src/app、i18n、lib）、`scripts/ops`、`tests/ops`、`docs/guides|plans|audits`。
3. **验证回路**（见 3.4）：`verify-fast.sh` 用于迭代；`verify-control-plane.sh` 合并前必须全绿。
4. **架构红线**（违反即 PR 不合格）：
   - `/api/admin/*` 与 `/api/vault/*` 边界双向失败关闭；不得跨边界接受凭据；
   - 授权判定只走 `modules/access/service.py`（或属主校验），禁止在路由内重复实现；
   - 默认拒绝：新凭据无任何 grant 时必须读不到任何 Secret；
   - 新审计动作必须先注册进 `AUDIT_ACTIONS` 元组；
   - 禁止隐式 tag 授权与遗留兼容路由（CONTRIBUTING 原文）;
   - Vault 写端点强制 `Idempotency-Key`；
   - 前端 i18n 必须同时更新 zh-CN 与 en（有测试强制）；
   - 改 API 必须 `npm run generate:api-types`（有门禁强制）；
   - 数据库变更必须走 Alembic 迁移且保留既有数据。
5. **新场景清单**（3.2 节全文内嵌）。
6. **模式索引**："要做 X，抄哪里"：
   - 新管理端模块 → `modules/spaces`（routes+schemas+审计+409 并发处理）；
   - 新管理端端点测试 → `test_revoke_all_tokens_*` 系列（会话/Token 认证差异、CSRF、审计行断言）；
   - 新前端页面 → `settings/security`（page+test+i18n+ConfirmDialog/toast 用法）；
   - 新 e2e → `test/e2e/security-settings.spec.ts` + `fixtures.ts`。
7. **决策记录索引**（3.5 节 ADR 入口），明确"这是设计，不是 bug"的清单。
8. **当前状态提示**：控制面 UI 为过渡版，重建在 `ui/shadcn-rebuild` 分支进行；新场景前端仍按现行模式实现，不做过度打磨；截图基线在重建后统一重录。
9. **文档义务**：代码与文档冲突时代码赢；改动配置项必须同步 `docs/guides` 环境变量表；新增公开 API 必须更新 README API 表。

### 3.2 新场景开发清单（内嵌于 AGENTS.md）

**后端场景（新端点/新模块）**

1. 数据模型：新表 → ORM + Alembic 迁移（数据保留，过 `check_migration_policy.py`）；新列注意 CHECK 约束兜底枚举。
2. `api_schemas.py` 增加响应模型。
3. 模块实现：授权走 access service；管理端变更写审计（action 先入 `AUDIT_ACTIONS`）；vault 写端点强制幂等键；并发整体替换类端点捕获 IntegrityError → 409。
4. 测试（缺一不可）：
   - 认证边界：错误凭据类 401（`vg_` 打管理端、`vgm_` 打 vault、会话专属端点拒 Token）；
   - 授权：越权 403/404 且不泄漏存在性；
   - 冲突路径 409；会话 Cookie 端点的 CSRF Origin 断言；
   - 审计行断言（action + result + 关键 metadata）；
   - vault 写：幂等重放与 hash 不匹配 409。
5. 跑快速回路至全绿。

**前端场景（新页面/新交互）**

1. `src/app/<route>/page.tsx` + 同目录 `page.test.tsx`（mock 模式照抄 security 页测试）。
2. i18n：zh-CN 与 en 同时加 key（对齐测试强制）。
3. `lib/vaultgate-api.ts` 增加调用函数与类型；然后 `npm run generate:api-types`。
4. e2e：`test/e2e/<name>.spec.ts`，使用 `fixtures.mockSession`，**至少一条移动端断言**（用 `assertNoHorizontalOverflow` 或视口相关可见性断言）。
5. 若页面含响应式布局/图表/表格切换：在 `visual.spec.ts` 登记该页截图基线（3.3-B）。
6. typecheck / lint / 单测全绿。

**部署/配置场景**

1. compose/Caddyfile/代理链改动 → 同步新增或修改 `tests/ops` 契约测试；
2. 新环境变量 → 三份 compose + `prod.env.example` + 对应 guide 环境变量表；
3. 涉及信任边界 → 更新 `production-security.md` 与 `coolify-deployment.md` 相应小节。

**文档场景**：新增公开 API → README API 表；新设计决策 → ADR（3.5）；功能上线 → 相关 guide。

### 3.3 测试规范（核心新增）

**A. i18n 对齐测试**（`src/i18n/messages.test.ts`，vitest 单测，快速回路内）

- 断言 zh-CN.json 与 en.json 的 key 树深度相等；
- 断言每个叶值非空字符串；
- 断言两侧 `{占位符}` 集合一致（防止一侧漏插值变量）；
- 断言顶层结构未被意外重排（可选：key 序一致，降低 diff 噪音）。

失败示例即拦截场景：agent 加了 `settings.security.revokeAllTitle` 到 zh-CN 忘了 en → 测试红。

**B. 双视口截图基线**（`test/e2e/visual.spec.ts`，完整回路内）

目标：把"移动端渲染类 bug"从"人工审计才能发现"变为"CI 必拦"。

- 工具：Playwright 内建 `toHaveScreenshot()`，零新增依赖；
- 覆盖矩阵（首期，刻意收敛）：
  - 视口：`chromium`（Desktop Chrome 1280×800）× `mobile-chrome`（Pixel 7）；
  - 主题：首期仅 light；dark 二期再加（控制基线维护成本）；
  - 页面：与 `accessibility.spec.ts` 共享同一 `appRoutes` 常量（`/`、`/agents`、`/secrets`、`/spaces`、`/audit`、`/settings/security`、`/settings/management-tokens`），另加 `/login`（未认证态）；新页面按清单 3.2 登记；
  - 环境钉死：`test.use` 固定 `timezoneId: 'UTC'`、`locale: 'en-US'`、`colorScheme: 'light'`，beforeEach 强制 next-themes 为 light；
- 稳定性措施：
  - 复用 `fixtures.mockSession` 固定登录态；数据用固定种子（fixture 创建名称固定的 secret/agent/审计行）；
  - 动态内容（时间戳、`last_used`）用 `mask` 或固定 mock 时间；
  - `use.reducedMotion: 'reduce'`（若全局开启影响其他 spec，则仅在 visual spec 内 `test.use`）；
  - 阈值：`maxDiffRatio: 0.01`，像素级 `threshold: 0.2`；基线一律在 CI（ubuntu）生成并提交，本地 macOS 差异通过阈值吸收，必要时在容器内重录；
- 维护规则：有意改 UI → 同 PR `npx playwright test --update-snapshots` 更新基线并在 PR 说明理由；基线 diff 成为**显式审查对象**；UI 重建完成后整体重录一次。

**C. 移动端功能断言规范**

- `test/e2e/fixtures.ts` 新增助手：
  - `assertNoHorizontalOverflow(page)`：`scrollWidth <= clientWidth`；
  - `assertTapTargets(page, minSize=44)`（可选二期）；
- 规则（写入 AGENTS.md + PR 模板）：每个新增/改版页面的 e2e spec 至少一条移动端断言；mobile-chrome project 已存在，缺的是**视口相关**的断言而非重跑桌面断言；
- 执行方式：清单 + PR 模板勾选 + 评审（"spec 是否含移动端断言"无法可靠静态检测，不假装机审）。

**D. 测试模板（文档化于 AGENTS.md 模式索引）**

- 后端新端点测试模板：以 revoke-all 测试为范本，列出必备断言清单（认证差异/CSRF/审计/幂等/并发 409）；
- 前端页面测试模板：以 `settings/security/page.test.tsx` 为范本（vi.mock vaultgate-api、错误映射、提交态禁用）；
- e2e 模板：`mockSession` + 关键交互 + 错误态 + 移动端断言骨架。

### 3.4 验证回路设计

| 回路 | 命令 | 内容 | 用途 |
|---|---|---|---|
| 快速（新增） | `scripts/ops/verify-fast.sh` | 完整回路减去浏览器/构建/部署配置：mypy、ruff、`check_migration_policy.py`、pytest（含 80% 覆盖率门禁）、`check:api-types`、typecheck、lint、vitest --run、test:coverage | agent 迭代内环，约 3–4 分钟 |
| 完整（既有） | `scripts/ops/verify-control-plane.sh` | 快速回路全集 + check:api-types + coverage + build + e2e（含 visual.spec）+ performance + 可选合成流 | 合并前与 CI |

- `verify-fast.sh` 显式声明"不含浏览器测试与构建"，防止 agent 误以为它等价于完整回路；脚本退出码与提示语写明。
- visual.spec 仅属完整回路（浏览器开销不进内环）。
- CI 不变，继续跑完整回路 + 安全扫描。

### 3.5 文档同步机制

1. **架构设计文档**：`2026-07-13-vaultgate-architecture-design.md` 文首加状态横幅："本文为 07-13 基线；Vault Spaces（07-20）以后见 `2026-08-20-vault-spaces-design.md`；冲突时以代码与测试为准"。补写 Spaces 设计文档（从现有代码/测试/production-security.md 反推：数据模型、角色矩阵、归档语义、迁移脚本处理重名）。
2. **决策记录（轻量 ADR）**：新建 `docs/decisions/README.md` + 编号条目（日期/决策/理由/状态）。首批种子：
   - ADR-001 Secret 名称全局唯一（含存在性旁路权衡）；
   - ADR-002 改密不连带吊销 Token（独立凭据 + 应急 revoke-all 补位）；
   - ADR-003 Coolify 宽 TRUSTED_PROXY_CIDRS 默认值与收窄脚本；
   - ADR-004 UI 过渡期与重建计划（引用 `ui/shadcn-rebuild` 分支状态）；
   - ADR-005 截图基线策略（首期矩阵、CI 生成、重建后重录）。
3. **自维护条款**：AGENTS.md 与 ADR 的更新义务写入 AGENTS.md 自身（改红线必须同 PR 改 AGENTS.md）；`docs/audits/README.md` 索引机制照旧。

### 3.6 Agent 接入方式

- Claude Code：自动读 CLAUDE.md（= AGENTS.md 符号链接）；
- OpenClaw / Hermes / 其他：优先读 AGENTS.md；若工具不自动加载，任务提示词首条附 AGENTS.md 全文或路径指令；
- 推荐任务提示词模板（用户侧使用）：

```
目标：<一句话场景描述>
约束：先读仓库根 AGENTS.md，严格遵循其中"新场景清单"（后端/前端/部署对应章节）。
验证：迭代用 scripts/ops/verify-fast.sh；完成前 scripts/ops/verify-control-plane.sh 必须全绿。
交付：代码 + 测试 + 受影响文档（含 i18n 双语、generated-api、环境变量表）。
```

## 4. 实施路线

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| P1（第 1 天） | AGENTS.md + CLAUDE.md 符号链接；i18n 对齐测试；`verify-fast.sh`；PR 模板（`.github/PULL_REQUEST_TEMPLATE.md`） | 删除一个 en.json key → 测试红；`verify-fast.sh` 可独立跑通 |
| P2（第 2–3 天） | visual.spec + 6 页双视口基线；fixtures 移动端断言助手；playwright 稳定性配置 | **故障演练**：注入一个仅移动端生效的 CSS 破坏（如审计页表格移动端溢出）→ 完整回路必须红；桌面-only 断言不得掩盖 |
| P3（第 4 天） | 架构文档横幅 + Spaces 设计补写；docs/decisions ADR 种子 5 条；AGENTS.md 模式索引校对 | 新 agent 冷启动只凭 AGENTS.md 能定位全部范本文件 |
| P4（第 5 天） | **冷启动演练**：向一个未参与本方案的 agent 下发样例场景（建议："为 Agent Token 增加到期提醒字段与列表过滤"），人工不干预，观察其是否按清单完成并一次通过完整回路 | 演练通过；发现的流程断点回填 AGENTS.md |

## 5. 风险与取舍

| 风险 | 影响 | 处置 |
|---|---|---|
| 截图基线维护成本（每次有意 UI 变更需重录） | 中 | 首期矩阵刻意收敛（6 页×2 视口×1 主题）；把重录变成显式 PR 审查而非隐性成本；UI 重建后统一重录 |
| 跨平台字体/渲染差异导致本地误红 | 中 | 基线只在 CI（ubuntu）生成；阈值吸收小差异；文档写明容器内重录路径 |
| AGENTS.md 腐化 | 高 | 自维护条款 + PR 模板勾选 + 每次审计把 AGENTS.md 准确性纳入检查项 |
| 移动端断言规则靠评审执行，可能漏 | 中 | visual.spec 兜底渲染面；评审清单明确；二期评估静态检测（扫描 spec 是否含 mobile 断言） |
| 工具差异（OpenClaw/Hermes 不读 AGENTS.md） | 低 | 接入模板提供提示词兜底；AGENTS.md 内容保持自包含、短小可粘贴 |

## 6. 验收总标准

1. 注入移动端-only 视觉回归 → CI 红（P2 演练）；
2. 删除任一 en.json key → 快速回路红；
3. 忘记 `generate:api-types` → 完整回路红（既有能力，回归确认）;
4. 冷启动 agent 演练一次通过完整回路（P4）；
5. 任一红线被违反时，存在机器门禁或明确评审核对点，二者至少居其一。

# VaultGate 代码整洁与鲁棒性审计

日期：2026-07-14  
基线：`main` / `edf3dee672c7f0dc898be4b702cfd816e4b667ec`

## 结论

整体评分：**75 / 100，条件通过**。

| 维度 | 评分 | 结论 |
| --- | ---: | --- |
| 架构边界 | 84 | Admin、Vault、Agent/Token/Grant 主边界清楚 |
| 代码整洁 | 78 | 静态检查全绿，但仍有 DTO、翻译、组件兼容层残留 |
| 后端鲁棒性 | 67 | 输入校验、轮换语义和代理限流存在真实缺陷 |
| 前端质量 | 70 | 分页和错误反馈较完整，但有可访问性和破坏性操作风险 |
| 测试质量 | 86 | 138 后端、58 前端测试通过；跨层生产拓扑仍有盲区 |
| 部署与恢复 | 65 | 容器化完整，但扫描、环境解析、回滚和恢复原子性不足 |
| 安全与审计 | 76 | 权限模型合理；代理 IP、扫描时序和审计语义仍需收口 |

问题总数：25（Critical 1、High 9、Medium 11、Low 4）。

## Critical

### C1. Skip Link 在受保护页面排到全局导航之后

- 位置：`apps/control-plane-v3/src/app/layout.tsx:65`、`apps/control-plane-v3/src/components/route-guard.tsx:150`
- 类别：Accessibility / WCAG 2.4.1
- 证据：Skip Link 是 `RouteGuard` 的 child；认证后 `RouteGuard` 先渲染 `AppNavigation`，再渲染 children。
- 影响：键盘用户必须先遍历导航，才能获得“跳到主内容”的控件，绕过重复区块失效。
- 建议：把 Skip Link 放到 `RouteGuard` 外层，确保它始终是页面首个可聚焦元素，并增加键盘 E2E。

## High

### H1. 过期 Token 轮换后仍然过期

- 位置：`apps/api/app/modules/tokens/routes.py:84`、`apps/api/app/modules/admin_auth/routes.py:249`
- 证据：轮换只替换哈希并清除 `revoked_at`，不更新 `expires_at`。动态复现中 Agent Token 和 `vgm_` Token 的新原文均返回 401。
- 影响：API 返回看似成功但不可使用的一次性凭据，旧原文已同时失效。
- 建议：轮换请求必须明确新 TTL，或按原始 TTL 重新计算过期时间；补过期 Token 轮换测试。

### H2. 非法 Secret 类型和显式 null 触发 500/错误 409

- 位置：`apps/api/app/modules/secrets/schemas.py:6`、`apps/api/app/modules/agents/schemas.py:9`
- 证据：动态复现结果为 `invalid_secret_type=500`、`null_secret_name=500`、`null_agent_name=409`。
- 影响：客户端错误进入数据库约束层，污染错误日志并返回错误状态语义。
- 建议：使用 `Literal`/枚举并为 PATCH 区分“未提供”和“不允许 null”，统一返回 422。

### H3. Caddy 后面的限流和审计只看到代理 IP

- 位置：`apps/api/app/rate_limit.py:79`、`docker-compose.prod.yml:57`
- 证据：`trusted_proxy_ips` 生产环境未配置且仅支持精确 IP；容器 IP 动态变化，Caddy 转发的真实 IP 不被信任。
- 影响：所有管理员登录共用同一 IP+email 桶，攻击者可造成全局登录锁定；审计 IP 也失真。
- 建议：支持可信 CIDR/代理跳数，生产 Compose 显式配置，并测试伪造与真实 `X-Forwarded-For`。

### H4. 部署脚本把 `.env.production` 当 shell 脚本执行

- 位置：`.github/workflows/deploy.yml:88`
- 证据：脚本执行 `. ./.env.production`；包含空格或 `#` 的强密码会被截断或作为命令执行。
- 影响：与应用已支持的保留字符密码直接冲突，可导致部署中断或意外 shell 展开。
- 建议：禁止 source dotenv；让 Compose 读取 env 文件，脚本所需变量用严格 dotenv 解析器或独立 GitHub Secrets 传入。

### H5. Security Scan 可能扫描旧的 `latest`

- 位置：`.github/workflows/security.yml:7`、`.github/workflows/security.yml:51`、`.github/workflows/docker-images.yml:4`
- 证据：两个 workflow 在 main push 时并发，Security Scan 直接拉取 `:latest`，没有等待同提交镜像构建完成。
- 影响：安全检查可以绿色通过，但扫描对象不是当前提交。
- 建议：构建、按 digest 扫描、推送整合进同一 workflow，或通过 `workflow_run` 串行并使用提交 SHA/digest。

### H6. 部署允许任意可变 tag，且没有扫描证明或自动回滚

- 位置：`.github/workflows/deploy.yml:5`、`.github/workflows/deploy.yml:101`
- 影响：可部署未对应当前提交、未扫描或被覆盖的 tag；Smoke 失败后坏版本仍保持运行。
- 建议：只接受 release SHA/digest，验证四镜像 provenance/scan 状态；保存旧 digest，失败自动回滚。

### H7. 生产 Caddy 路由覆盖前端 `/docs` 页面

- 位置：`ops/caddy/Caddyfile:21`、`apps/control-plane-v3/src/app/docs/page.tsx:1`
- 证据：`/docs*` 全部反代 FastAPI，前端 Docs 页面在标准生产拓扑永远不可达。
- 影响：导航中的 Docs 实际打开 Swagger，而不是前端快速指南；E2E 未经过 Caddy，无法发现冲突。
- 建议：Swagger 改到明确路径（如 `/api/docs`），或删除重复前端页面；增加生产路由 E2E。

### H8. 破坏性凭据操作没有确认

- 位置：`apps/control-plane-v3/src/app/agents/[agentId]/page.tsx:82`、`:227`、`:248`
- 影响：停用 Agent、轮换和撤销 Token 都可单击立即执行；误触会让正在运行的 Agent 即刻失效。
- 建议：使用现有 `ConfirmDialog`，明确展示影响对象；轮换需提示旧 Token 立即失效。

### H9. 数据恢复不是单事务且部署失败不回滚

- 位置：`scripts/ops/restore-postgres.sh:22`、`.github/workflows/deploy.yml:102`
- 影响：`pg_restore --clean` 中途失败可能留下部分恢复数据库；新栈 Smoke 失败也没有恢复旧镜像。
- 建议：在干净临时库恢复并验证后切换，或使用可行的单事务恢复；部署记录并恢复旧 digest。

## Medium

### M1. Bootstrap Header 在替代拓扑中丢失

- 位置：`apps/control-plane-v3/src/app/api/[...path]/route.ts:15`、`apps/api/app/factory.py:148`
- 描述：Next 代理和 CORS allow-header 均未包含 `X-Bootstrap-Token`。
- 影响：绕过标准 Caddy、直接使用 Web 同源代理或前后端分域时，生产初始化失败。

### M2. Agent 停用存在两套 API 和两种审计语义

- 位置：`apps/api/app/modules/agents/routes.py:111`、`:140`、`apps/control-plane-v3/src/domains/agent.ts:53`
- 描述：UI 用 PATCH 停用，记录 `agent.update`；DELETE 才记录 `agent.disable`，但 UI 不使用。
- 影响：相同管理员行为产生不同审计动作，启用也没有独立动作。

### M3. 审计统计把所有成功管理行为都标成 Granted Access

- 位置：`apps/control-plane-v3/src/app/audit/page.tsx:47`
- 描述：`total - denied` 包含登录、创建、更新、删除等事件，不等于授权访问。
- 影响：Dashboard 给出错误安全含义。

### M4. 审计过滤能力与设计文档冲突

- 位置：`apps/api/app/modules/audit/routes.py:16`、`docs/plans/2026-07-13-vaultgate-architecture-design.md:203`
- 描述：当前仅支持 action/result；设计要求 Agent、Token、Secret、actor 和时间范围。

### M5. Agent 详情 Token DTO 不完整

- 位置：`apps/api/app/modules/agents/routes.py:97`、`apps/control-plane-v3/src/lib/vaultgate-api.ts:112`
- 描述：后端缺少 TS 类型声明的 `agent_id`、`description`、`created_at`。
- 影响：类型系统错误地保证字段存在，后续 UI 使用时会得到 undefined。

### M6. API 客户端不能稳健处理非 JSON 错误

- 位置：`apps/control-plane-v3/src/lib/vaultgate-api.ts:31`
- 描述：任何非空响应都直接 `JSON.parse`；代理 502 HTML 或空白错误体会变成 SyntaxError，而不是 `ApiError`。

### M7. SWR 重验证可能覆盖未保存的授权选择

- 位置：`apps/control-plane-v3/src/app/agents/[agentId]/page.tsx:212`
- 描述：每次 grant 数据重验证都 `setSelected(secretIds)`；焦点/网络恢复时可能丢弃管理员尚未保存的跨页选择。

### M8. 会话/Token/审计无限增长，认证请求产生持续写放大

- 位置：`apps/api/app/modules/admin_auth/service.py:67`、`apps/api/app/modules/vault/service.py:35`
- 描述：每次认证都提交 `last_used_at`，过期 Session/Token 没有清理，AuditLog 没有保留策略。
- 影响：长期运行下数据库写负载和表体积持续增长。

### M9. 管理 Token 与 Agent Token 列表没有分页

- 位置：`apps/api/app/modules/admin_auth/routes.py:163`、`apps/api/app/modules/agents/routes.py:84`
- 影响：管理员创建大量 Token 后，响应和 Agent 页面渲染没有上界。

### M10. 触控目标和交互语义不统一

- 位置：`apps/control-plane-v3/src/components/ui/button.tsx:26`、`apps/control-plane-v3/src/app/audit/page.tsx:69`、`apps/control-plane-v3/src/app/docs/docs-content.tsx:20`
- 描述：`sm` 按钮为 40px，审计筛选按钮更小；Docs 使用 Link 包 Button 的嵌套交互控件。
- 建议：移动端至少 44px；使用 `Button asChild` 包 Link。

### M11. 功能实现与已批准设计仍有差距

- 位置：`apps/control-plane-v3/src/app/secrets/page.tsx:1`、`apps/control-plane-v3/src/app/agents/[agentId]/page.tsx:1`
- 描述：Secret 编辑、搜索、标签输入、管理员临时查看明文，以及 Agent 最近活动/关联审计/TTL 输入尚未实现。

## Low

### L1. 已删除 Tokens 页面仍有整块翻译和错误文档

- 位置：`apps/control-plane-v3/src/i18n/messages/en.json:97`、`:217`
- 描述：Quick Start 仍要求进入不存在的 Tokens 页面并使用已废弃的 scopes 术语。

### L2. 旧按钮 variant 兼容别名仍存在

- 位置：`apps/control-plane-v3/src/components/ui/button.tsx:14`
- 描述：`primary`/`danger` 与 `default`/`destructive` 重复，和“不保留兼容层”目标冲突。

### L3. 查询串和 SecretType 定义重复

- 位置：`apps/control-plane-v3/src/lib/vaultgate-api.ts:156`、`src/domains/agent.ts:22`、`src/domains/secret.ts:29`、`src/app/secrets/page.tsx:24`
- 影响：排序、编码和枚举变更需要多处同步。

### L4. 生产模板包含未生效的配置项

- 位置：`ops/compose/prod.env.example:34`
- 描述：`HSTS_MAX_AGE`、`CSP_REPORT_ONLY` 没有被 Caddyfile 使用；`APP_ENV`/`SESSION_SECURE` 在生产 Compose 中固定。

## 正向发现

- Admin 与 Vault API 边界清楚，`vg_`/`vgm_` 类型隔离和逐 Secret 默认拒绝正确。
- 单管理员约束由数据库唯一约束保证，并发初始化不会创建第二个管理员。
- Secret 明文读取先持久化审计，审计失败时不会返回明文。
- Alembic 保留数据、真实 PostgreSQL、备份恢复、Caddy 和四镜像已有系统测试。
- Ruff、mypy、ESLint、Prettier 全绿；后端 138 项测试、前端 58 项测试通过。
- 前端已有暗色主题、缩放支持、reduced-motion、分页和多数错误反馈。

## 推荐修复顺序

1. 修复轮换 TTL、输入 422、代理 IP、dotenv source 和 `/docs` 路由冲突。
2. 收口安全扫描到提交 digest，并给部署增加 digest 验证与回滚。
3. 修复 Skip Link、破坏性操作确认、触控目标和嵌套交互。
4. 统一 Agent 停用审计、Token DTO、审计统计/筛选和 Bootstrap Header。
5. 加入 Session/Token/Audit 保留策略，减少 `last_used_at` 写放大并分页 Token。
6. 删除 Tokens 翻译与按钮兼容层，抽取统一 query key/DTO/SecretType。
7. 完成 Secret 编辑/临时查看/搜索/标签与 Agent 活动等已批准功能。

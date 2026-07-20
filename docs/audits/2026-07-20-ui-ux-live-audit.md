# VaultGate UI/UX 与业务流实测审计报告

审计日期：2026-07-20
方式：本地 docker compose 真实栈（postgres + api + web）+ Playwright 驱动系统 Chrome，18+ 张全页截图（桌面/移动 × 浅色/深色）+ 两条完整业务流走查 + 几何测量，非静态代码审查。
前置：代码级 UI/UX 审计与两轮修复见 `2026-07-19-full-audit.md`、`2026-07-19-post-fix-reaudit.md`。

> 时点标注：本报告所有验证数字（测试数、覆盖率、i18n 键对齐数等）均为 2026-07-20 实测时点的快照；仓库最新状态以 `scripts/ops/verify-control-plane.sh` 的最新运行为准。

## 1. 结论

**全部核心业务流在真实浏览器中端到端走通，无阻断问题；前两轮修复的 UX 改进在真机上确认生效。** 本轮新发现 4 个小 UX 问题（已修复）+ 1 个产品策略问题（待决策）。

## 2. 走查通过的业务流

**首装流程**：全新栈 `/` 重定向 `/setup`；弱密码（仅小写）被前端策略精确拦截，InlineAlert 显示具体规则（"至少 12 个字符，且需同时包含大写字母、小写字母、数字和特殊字符"）；强密码建号 → `/login`。

**日常主链路**：登录（错误密码显示统一 InlineAlert）→ 对话框创建密钥 → 创建 Agent → 签发 Token（琥珀色一次性明文横幅 + 复制 toast + 按钮"已复制"态）→ 勾选授权 → 保存（绿色"密钥授权已保存"）→ 审计页事件齐全（granted/denied subtle 徽章）→ 退出回 `/login`。无 JS 页面错误。

**视觉面**：深色模式三屏（dashboard/agent 详情/audit）对比度与 subtle 徽章全部可读；移动端四屏布局正确（audit 卡片/表格双视图切换正常）；固定底部导航遮挡疑虑经几何测量排除（最大滚动时"保存授权"按钮底 727px < 导航顶 779px，无遮挡，fullPage 截图中的重叠为拼接伪影）。

## 3. 本轮发现与修复

| 发现 | 位置 | 处理 |
|---|---|---|
| Agent 详情默认选中最新的已吊销 Token（列表按创建时间倒序），用户打开先看到死 Token 面板 | `agents/[agentId]/page.tsx` | 已修：无有效选中时优先第一个 active Token，新增回归测试 |
| 已吊销 Token 的授权面板仍可勾选/保存（无意义操作） | `features/agents/agent-token-workspace.tsx` | 已修：非 active Token 的授权 fieldset 整体禁用 + 提示文案（`agents.grantsDisabledRevoked` 双语），轮换回 active 自动恢复；新增 2 个组件测试 |
| docs 快速入门"仪表板"与导航"概览"术语不一致 | `zh-CN.json docs.step1` | 已修：改"概览"；en 无漂移；全文件 grep 确认唯一残留 |
| 登录副标题"访问VaultGate"中英文间缺空格 | `zh-CN.json auth.login.subtitle` | 已修；grep 确认唯一处 |

验证：`typecheck`/`lint` 通过，`vitest` 30 文件 104 测试通过（净增 3），`next build` 生产构建通过，zh-CN/en 332/332 键对齐。

## 4. 产品决策与实施（已闭环）

**Secret 与 Agent Token 名称允许重复，与 Agent 名称唯一（409）策略不一致。** 实测可创建两个同名 Secret（"ui-created-secret"×2），授权面板/列表中无法区分；同名 Token 同样可签发。凭据管理场景下重名会造成授权混淆。

**决策（2026-07-20 用户确认）**：方案①，后端强制唯一。

**实施（migration `20260720_01`）**：
- `secrets.name` 全局唯一索引 `uq_secrets_name`；`agent_tokens.(agent_id, name)` 作用域唯一索引 `uq_agent_tokens_agent_id_name`（不同 Agent 可重名）。
- 保数据迁移：升级时按 `created_at` 排序保留首行原名，重名行自动追加 ` (2)`、` (3)` 后缀（处理后缀碰撞与 255 字符截断边界），再建唯一索引；downgrade 仅 drop 索引。
- 路由 409：Secret 创建/改名撞名 → "Secret name already exists"；同 Agent 重名 Token → "Token name already exists for this agent"，与 `create_agent` 的 IntegrityError→409 模式一致。前端经既有 InlineAlert 路径展示。
- 大小写行为：SQLite BINARY 与 PG 默认 collation 均大小写敏感，"Name" 与 "name" 不冲突（测试注释固化）。
- 验证：后端 130 测试通过（新增 5 个）、覆盖率 90.44%、`alembic check` 零漂移；实机 PostgreSQL 注入合成重名 → entrypoint 迁移后重名归零、最早行保留原名、唯一索引生效、手动插重名被拒。

## 5. 实测环境说明

dev 拓扑（浏览器 → Next 代理 → API）下审计 `user_agent` 正常落库、`ip_address` 为 web 容器地址（无信任代理，fail-closed 设计，见再审计报告 B-低4）；生产拓扑 Caddy 直连 API 记录真实客户端 IP。审计日志中的 IP/UA 脱敏与响应字段以 `AuditLogResponse` 为准（列表不含 ip/ua 字段，属设计）。

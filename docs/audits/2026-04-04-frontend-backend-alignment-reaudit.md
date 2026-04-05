# Frontend/Backend Alignment Re-Audit

Date: 2026-04-04

## Scope

本次为基于当前未提交工作树的再次重审计，重点复核：

- `apps/control-plane-v3`
- `apps/api`
- 路由与权限层：`route-policy.ts`、`role-system.ts`、`route-guard.tsx`
- 重点页面：`tasks`、`spaces`、`identities`、`approvals`、`playbooks`、`runs`

本轮目标：

1. 重新确认前后端权限边界是否仍然一致。
2. 区分“整个前端尚未实现”与“前端已实现但入口分散/页面缺入口”。
3. 把当前仍存在的偏移整理成可直接执行的 backlog。

## Executive Summary

当前项目仍然没有达到“前后端完美对接”，但问题已经收敛到更清晰的几类：

1. 真正的权限边界偏移：
   - `/tasks`
   - `/spaces`
2. 会话恢复与缓存刷新不完整：
   - `401/403` 恢复链不统一
   - `spaces`、`identities` 的 refresh/mutate 链不完整
3. 新页面缺最小回归保护：
   - `approvals`
   - `playbooks`
   - `runs`
4. 身份管理相关能力并非“全前端缺失”，而是“能力已存在，但没有在 `identities` 聚合成完整管理入口”

### Severity Snapshot

- High: 6
- Medium: 4

## What Is Confirmed Good

以下结论在当前工作树上仍成立：

- `/approvals`、`/playbooks`、`/runs` 已进入 [`route-policy.ts`](../../apps/control-plane-v3/src/lib/route-policy.ts)
- 全局 [`RouteGuard`](../../apps/control-plane-v3/src/components/route-guard.tsx) 已结合 [`role-system.ts`](../../apps/control-plane-v3/src/lib/role-system.ts) 做角色校验
- Sidebar 已按角色过滤显示路由入口
- `approvals` domain 当前对接的是后端真实存在的接口
- `settings` 页面已具备管理账号邀请/禁用能力
- `tokens` 页面已具备 agent 创建、token 签发、token 撤销能力

## Capability Matrix

这部分用于区分“前端完全没做”与“前端做了但页面聚合不完整”。

| Backend capability | Backend status | Frontend status | 当前偏移结论 |
| --- | --- | --- | --- |
| Invite admin account | Exists | Exists in `settings` | `identities` 页面缺入口，不是全前端缺失 |
| Disable admin account | Exists | Exists in `settings` | `identities` 页面缺入口，不是全前端缺失 |
| Create agent | Exists | Exists in `tokens` | `identities` 页面缺入口，不是全前端缺失 |
| Issue token | Exists | Exists in `tokens` | `identities` 页面缺入口，不是全前端缺失 |
| Revoke token | Exists | Exists in `tokens` | `identities` 页面缺入口，不是全前端缺失 |
| Delete agent | Exists | Exists in `identities` | 当前已对齐 |
| Approve/reject approval | Exists | Exists in `approvals` | 当前已对齐，但缺测试与恢复链 |
| Create/search/detail playbook | Exists | Exists in `playbooks` | 当前已对齐，但缺测试与恢复链 |
| List/detail runs | Exists | Exists in `runs` | 当前已对齐，但缺测试与恢复链 |

## High-Severity Findings

### H1. `/tasks` 仍然不是一个真实可用的 `operator` 页面

前端角色映射仍把 `/tasks` 定义为 `operator`：

- [`role-system.ts`](../../apps/control-plane-v3/src/lib/role-system.ts)

但当前页面组合查询仍依赖 admin-only 能力：

- [`tasks/page.tsx`](../../apps/control-plane-v3/src/app/tasks/page.tsx)
- [`hooks-dashboard.ts`](../../apps/control-plane-v3/src/domains/task/hooks-dashboard.ts)
- [`agents.py`](../../apps/api/app/routes/agents.py)
- [`agent_tokens.py`](../../apps/api/app/routes/agent_tokens.py)
- [`token_feedback.py`](../../apps/api/app/routes/token_feedback.py)

具体偏移：

- 页面入口允许 `operator`
- 但 `GET /api/agents` 需要 admin-or-higher
- `GET /api/agents/{agent_id}/tokens` 需要 admin-or-higher
- `GET /api/agent-tokens/{token_id}/feedback` 需要 admin-or-higher
- `POST /api/task-targets/{task_target_id}/feedback` 需要 admin

影响：

- `operator` 进入页面后，首屏数据和反馈动作都可能直接落入 `403`
- 当前页面真实上更像 admin 运营面，而不是 operator 最小权限任务面板

### H2. `/spaces` 仍把 any-session 基础能力与 admin-only 运营面板强耦合

后端 `spaces` 基础读取能力：

- [`spaces.py`](../../apps/api/app/routes/spaces.py)
  - `GET /api/spaces` => any management session
  - `GET /api/spaces/{id}` => any management session

当前前端页面仍同时依赖：

- [`spaces/page.tsx`](../../apps/control-plane-v3/src/app/spaces/page.tsx)
- [`events.py`](../../apps/api/app/routes/events.py)
- `reviews`
- `agents/tokens`
- `secrets/capabilities`

这意味着当前 `/spaces` 实际需要更高权限才能稳定加载完整页面，而不是后端 already-supported 的轻量空间视图。

影响：

- 后端已开放的低权限 space read 能力没有被前端兑现
- 页面整体仍偏 admin workspace，而不是 “基础空间视图 + 可选管理面板”

### H3. `management-session-recovery` 仍只把 `401` 识别为可恢复会话问题

证据：

- [`management-session-recovery.tsx`](../../apps/control-plane-v3/src/lib/management-session-recovery.tsx)

当前实现：

- `401` => `shouldShowSessionExpired`
- `403` => 不进入统一恢复链

影响：

- 用户具备登录态但不具备资源权限时，页面仍容易退化成通用错误
- “登录失效”和“权限不足”没有被清晰地区分
- 对 `/tasks`、`/spaces` 这类混合权限页面尤其容易形成误导

### H4. `spaces` add-member 成功后，当前列表页不会稳定刷新到最新成员

证据：

- [`space/hooks.ts`](../../apps/control-plane-v3/src/domains/space/hooks.ts)
- [`spaces/page.tsx`](../../apps/control-plane-v3/src/app/spaces/page.tsx)

当前行为：

- 页面渲染的是 `useSpaces()` 列表缓存
- `useAddSpaceMember()` 只 `mutate('/spaces/${spaceId}')`
- 当前页面并未消费 `useSpace(spaceId)` 的详情 key

影响：

- 后端已成功写入成员，但当前列表页可能仍展示旧成员列表
- 用户会误判“添加失败”或重复提交

### H5. `identities` 仍不是完整的身份管理枢纽，能力分散在其他页面

这不是“整个前端没有实现这些能力”，而是“这些能力没有在 `identities` 里聚合”。

后端能力：

- invite/disable admin account: [`admin_accounts.py`](../../apps/api/app/routes/admin_accounts.py)
- create agent: [`agents.py`](../../apps/api/app/routes/agents.py)
- issue/revoke token: [`agent_tokens.py`](../../apps/api/app/routes/agent_tokens.py)

当前前端分布：

- `settings` 负责 invite/disable admin account
- `tokens` 负责 create agent / issue token / revoke token
- `identities` 只负责列表、搜索、事件概览、删除 agent

证据：

- [`identities/page.tsx`](../../apps/control-plane-v3/src/app/identities/page.tsx)
- [`human-operators-section.tsx`](../../apps/control-plane-v3/src/app/identities/human-operators-section.tsx)
- [`ai-agents-section.tsx`](../../apps/control-plane-v3/src/app/identities/ai-agents-section.tsx)
- [`agent-management-card.tsx`](../../apps/control-plane-v3/src/app/identities/agent-management-card.tsx)
- [`settings/page.tsx`](../../apps/control-plane-v3/src/app/settings/page.tsx)
- [`tokens/page.tsx`](../../apps/control-plane-v3/src/app/tokens/page.tsx)

影响：

- 如果产品定位是 “Identity Management”，当前页面能力与标题不匹配
- 用户需要跨页面寻找同一身份域动作，信息架构仍有割裂

### H6. `identities` 的 “Refresh Snapshot” 仍未覆盖全部实际依赖数据

证据：

- [`identities/page.tsx`](../../apps/control-plane-v3/src/app/identities/page.tsx)
- [`identity/hooks.ts`](../../apps/control-plane-v3/src/domains/identity/hooks.ts)
- [`event/hooks.ts`](../../apps/control-plane-v3/src/domains/event/hooks.ts)

当前页面实际依赖：

- `useAdminAccounts()`
- `useAgentsWithTokens()`
- `useEvents()`

但 `refreshSnapshot()` 当前只刷新：

- `refreshSession()`
- `refreshAdminAccounts()`
- `refreshAgents()`

没有刷新：

- `AGENT_TOKENS_BULK_KEY`
- `EVENTS_FEED_KEY`

影响：

- 页面文案叫 “Refresh Snapshot”，但 token coverage / recent feedback event 指标可能仍是旧值

## Medium-Severity Findings

### M1. `approvals`、`playbooks`、`runs` 仍无页面级 smoke tests

当前仍未找到：

- `apps/control-plane-v3/src/app/approvals/page.test.tsx`
- `apps/control-plane-v3/src/app/playbooks/page.test.tsx`
- `apps/control-plane-v3/src/app/runs/page.test.tsx`

影响：

- 新页面的首屏渲染、空态、错误态、最小交互缺少回归保护

### M2. 路由测试矩阵仍未覆盖新路由

虽然运行时代码已有：

- `/approvals`
- `/playbooks`
- `/runs`

但测试仍未同步覆盖：

- [`route-policy.test.ts`](../../apps/control-plane-v3/src/lib/route-policy.test.ts)
- [`shell-route-integrity.test.ts`](../../apps/control-plane-v3/src/app/shell-route-integrity.test.ts)

影响：

- 新路由再次漏配时，当前测试仍不容易第一时间报警

### M3. `approvals`、`playbooks`、`runs` 仍缺统一 query-level session recovery

当前三页虽然都有管理路由守卫，但页面内部仍使用各自的加载/报错卡片：

- [`approvals/page.tsx`](../../apps/control-plane-v3/src/app/approvals/page.tsx)
- [`playbooks/page.tsx`](../../apps/control-plane-v3/src/app/playbooks/page.tsx)
- [`runs/page.tsx`](../../apps/control-plane-v3/src/app/runs/page.tsx)

没有接入：

- `useManagementPageSessionRecovery`

影响：

- 登录后 session 失效、或查询过程中掉成 `401/403` 时，体验仍不统一

### M4. 前端访问策略已经分裂成两个来源，`route-policy.ts` 不再是“单一真实来源”

证据：

- [`route-policy.ts`](../../apps/control-plane-v3/src/lib/route-policy.ts)
- [`role-system.ts`](../../apps/control-plane-v3/src/lib/role-system.ts)
- [`route-guard.tsx`](../../apps/control-plane-v3/src/components/route-guard.tsx)

当前状态：

- `route-policy.ts` 负责“是否需要 authenticated”
- `role-system.ts` 负责“需要什么最小角色”
- 注释仍把 `route-policy.ts` 描述为 access control 的 single source of truth

影响：

- 这不是立即的用户面故障，但已经构成维护层偏移
- 未来新增路由时，容易只改其中一处，导致角色与认证矩阵不同步

## Page-By-Page Checklist

### `tasks`

已对齐：

- 任务列表
- 创建任务
- 反馈录入
- 页面级 session recovery

仍偏移：

- 页面角色边界与后端真实依赖不一致
- 对 admin-only agents/tokens/feedback 缺降级策略
- `403` 体验不清晰

### `spaces`

已对齐：

- spaces 列表
- 创建 space
- 添加成员
- 页面级 session recovery

仍偏移：

- 没有兑现后端 any-session 的轻量 spaces 视图
- add-member 后列表刷新链不完整
- admin-only 面板与基础空间能力仍耦合

### `identities`

已对齐：

- human / agent 列表与搜索
- agent token / recent event 可视化
- delete agent

仍欠缺：

- 作为“Identity Management”聚合页的入口完整性
- invite/disable admin account 的页内入口
- create agent / issue token / revoke token 的页内入口
- 完整 snapshot refresh

### `approvals`

已对齐：

- 列表
- 状态筛选
- approve / reject

仍欠缺：

- smoke test
- query-level session recovery
- 更清晰的 `403/409` 错误表达

### `playbooks`

已对齐：

- 搜索
- task type / tag 筛选
- 详情
- 创建

仍欠缺：

- smoke test
- query-level session recovery

### `runs`

已对齐：

- runs 列表
- 状态筛选
- 详情

仍欠缺：

- smoke test
- query-level session recovery

## Final Verdict

当前最关键的结论有三条：

1. 现在最大的真实前后端偏移仍然集中在 `/tasks` 和 `/spaces` 的权限边界。
2. `identities` 的主要问题已从“前端完全没做”收敛为“能力入口分散，聚合页能力名不副实”。
3. 新页面功能主体已落地，但恢复链与测试保护层还没有跟上。

# Frontend/Backend Alignment Re-Audit

Date: 2026-04-03

## Scope

本次为当前工作树上的重新审计，并进一步细化到页面级缺口清单。

审计目标：

1. 确认前后端契约、权限和状态同步是否继续收敛。
2. 复核上一轮问题里哪些已经修复。
3. 给出“每个页面还缺哪些前端功能/对接能力/测试”的明确 checklist。

审计范围主要覆盖：

- Frontend: `apps/control-plane-v3`
- Backend: `apps/api`
- 重点页面：`tasks`、`spaces`、`identities`、`approvals`、`playbooks`、`runs`

## Executive Summary

当前项目比前几轮更稳定，但仍然 **没有达到完美对接**。

### 已确认修复

- `route-policy.ts` 已补齐：
  - `/approvals`
  - `/playbooks`
  - `/runs`
- 新页面都已接入 `ManagementRouteGuard`
- `typecheck` 已恢复通过
- Sidebar 底部 `/settings` 已补角色过滤
- `approval` domain 只保留后端真实存在的接口

本轮实际验证：

```bash
cd apps/control-plane-v3 && npm exec tsc --noEmit
```

结果：`exit code 0`

### 当前仍然存在的核心问题

- `/tasks` 仍然不是一个真正的 `operator` 最小权限页面
- `/spaces` 仍把低权限可读资源和 admin-only 运营数据耦在一个大页里
- `identities` 页面仍缺少多项已存在后端能力对应的前端入口
- `403` 和页面级 query-error recovery 仍不完整
- `spaces` / `identities` 仍有前端状态刷新不完整的问题
- `approvals` / `playbooks` / `runs` 缺 page smoke tests，路由测试矩阵也未同步更新

### Severity Snapshot

- Critical: 0
- High: 6
- Medium: 3

## Closed Since Previous Audit

### 1. New pages are now covered by `route-policy`

当前 `route-policy.ts` 已明确收录：

- `/approvals`
- `/playbooks`
- `/runs`

证据：

- `apps/control-plane-v3/src/lib/route-policy.ts:128`

### 2. New pages now use `ManagementRouteGuard`

当前三页都已包裹管理路由守卫：

- `approvals`
- `playbooks`
- `runs`

证据：

- `apps/control-plane-v3/src/app/approvals/page.tsx:12`
- `apps/control-plane-v3/src/app/playbooks/page.tsx:12`
- `apps/control-plane-v3/src/app/runs/page.tsx:17`

### 3. Typecheck is no longer blocked

已验证：

```bash
cd apps/control-plane-v3 && npm exec tsc --noEmit
```

结果：`exit code 0`

### 4. Sidebar bottom navigation is now role-filtered

证据：

- `apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx:131`
- `apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx:163`

## High-Severity Findings

### H1. `/tasks` 仍然不是一个真正按 `operator` 最小权限设计出来的页面

前端路由角色：

- `/tasks` => `operator`

但当前页面组合依赖仍然包含：

- `GET /api/agents` => admin
- `GET /api/agents/{agent_id}/tokens` => admin
- `GET /api/agent-tokens/{token_id}/feedback` => admin
- `POST /api/task-targets/{task_target_id}/feedback` => admin

证据：

- `apps/control-plane-v3/src/app/tasks/page.tsx:7`
- `apps/control-plane-v3/src/app/tasks/page.tsx:67`
- `apps/control-plane-v3/src/domains/task/hooks-dashboard.ts:48`
- `apps/control-plane-v3/src/domains/task/hooks-dashboard.ts:59`
- `apps/control-plane-v3/src/domains/task/hooks-dashboard.ts:83`
- `apps/api/app/routes/agents.py`
- `apps/api/app/routes/agent_tokens.py`
- `apps/api/app/routes/token_feedback.py`

影响：

- 页面入口权限和页面真实能力边界仍不一致。
- `/tasks` 仍然更像 admin 运营面，而不是 operator 最小权限任务面板。

### H2. `/spaces` 仍然把低权限可读资源与 admin-only 运营数据耦合在同一页

后端 `spaces` 本身支持：

- `GET /api/spaces` => any management session
- `GET /api/spaces/{id}` => any management session

但当前前端 `spaces` 页面仍强绑定：

- `/api/events` => admin
- `/api/agents` / tokens => admin
- `/api/secrets` => admin
- review/governance 操作面板

证据：

- `apps/control-plane-v3/src/app/spaces/page.tsx:42`
- `apps/control-plane-v3/src/app/spaces/page.tsx:46`
- `apps/control-plane-v3/src/app/spaces/page.tsx:48`
- `apps/control-plane-v3/src/app/spaces/page.tsx:49`
- `apps/api/app/routes/spaces.py`
- `apps/api/app/routes/events.py`
- `apps/api/app/routes/agents.py`
- `apps/api/app/routes/secrets.py`

影响：

- 后端已具备较低权限的 spaces 读取能力。
- 前端仍未拆出 viewer/operator 友好的轻量空间视图。

### H3. `identities` 页面仍缺少多个已存在后端管理能力的前端入口

后端已提供：

- 邀请管理账号：`POST /api/admin-accounts`
- 禁用管理账号：`POST /api/admin-accounts/{account_id}/disable`
- 创建 agent：`POST /api/agents`
- 签发 token：`POST /api/agents/{agent_id}/tokens`
- 撤销 token：`POST /api/agent-tokens/{token_id}/revoke`

当前前端 `identities` 页面实际提供的只是：

- 列表/搜索 human accounts
- 列表/搜索 agents
- 查看 token 与近期事件
- owner 删除 agent

并没有看到这些后端管理能力对应的 UI 入口或表单流。

证据：

- `apps/api/app/routes/admin_accounts.py:44`
- `apps/api/app/routes/admin_accounts.py:73`
- `apps/api/app/routes/agents.py:34`
- `apps/api/app/routes/agent_tokens.py:47`
- `apps/api/app/routes/agent_tokens.py:80`
- `apps/control-plane-v3/src/app/identities/page.tsx`
- `apps/control-plane-v3/src/app/identities/human-operators-section.tsx`
- `apps/control-plane-v3/src/app/identities/ai-agents-section.tsx`
- `apps/control-plane-v3/src/app/identities/agent-management-card.tsx`
- `rg -n "useCreateAdminAccount|useDisableAdminAccount|useCreateAgent|useCreateAgentToken|useRevokeAgentToken" apps/control-plane-v3/src/app/identities` returned no matches

影响：

- “Identity Management” 页面目前更像观测页，而不是完整管理页。
- 后端已有的主管理动作还没有在前端暴露出来。

### H4. `403` 页面恢复链仍不完整

当前 `management-session-recovery.tsx` 仍只把 `401` 识别成特殊恢复场景。

证据：

- `apps/control-plane-v3/src/lib/management-session-recovery.tsx:12`
- `apps/control-plane-v3/src/lib/management-session-recovery.tsx:22`
- `apps/control-plane-v3/src/lib/management-session-recovery.tsx:32`

影响：

- 当用户能进入页面，但组合查询中的某个请求返回 `403` 时，前端仍容易退化成泛化错误态。
- 这会继续模糊“权限不足”和“系统异常”的区别。

### H5. `spaces` add-member 成功后不会刷新当前列表视图

当前 `spaces` 页面展示的是 `useSpaces()` 列表结果：

- `spacesQuery.spaces`

但 `useAddSpaceMember()` 成功后只刷新：

- `mutate(\`/spaces/${spaceId}\`)`

而当前页面并没有消费 `useSpace(spaceId)` 详情 key。

证据：

- `apps/control-plane-v3/src/domains/space/hooks.ts:13`
- `apps/control-plane-v3/src/domains/space/hooks.ts:89`
- `apps/control-plane-v3/src/domains/space/hooks.ts:96`
- `apps/control-plane-v3/src/app/spaces/page.tsx:47`
- `apps/control-plane-v3/src/app/spaces/page.tsx:257`

影响：

- 后端添加成员成功后，当前列表页很可能不会立即反映新成员。

### H6. `identities` 的 “Refresh Snapshot” 仍不会刷新 token 覆盖和 event 派生指标

`identities` 页面当前依赖：

- `useAdminAccounts()`
- `useAgentsWithTokens()`
- `useEvents()`

但 `refreshSnapshot()` 实际只刷新：

- `refreshSession()`
- `refreshAdminAccounts()`
- `refreshAgents()`

并没有刷新：

- `useAgentsWithTokens()` 使用的 bulk token key
- `useEvents()` 的事件流

证据：

- `apps/control-plane-v3/src/app/identities/page.tsx:50`
- `apps/control-plane-v3/src/app/identities/page.tsx:51`
- `apps/control-plane-v3/src/app/identities/page.tsx:52`
- `apps/control-plane-v3/src/app/identities/page.tsx:128`
- `apps/control-plane-v3/src/domains/identity/hooks.ts:16`
- `apps/control-plane-v3/src/domains/identity/hooks.ts:136`
- `apps/control-plane-v3/src/domains/identity/hooks.ts:198`
- `apps/control-plane-v3/src/domains/event/hooks.ts:8`
- `apps/control-plane-v3/src/domains/event/hooks.ts:35`

影响：

- 页面文案叫 “Refresh Snapshot”，但 token coverage 和反馈事件统计可能仍然保持旧值。

## Medium-Severity Findings

### M1. `approvals`、`playbooks`、`runs` 仍缺少页面级冒烟测试

当前仍没有：

- `apps/control-plane-v3/src/app/approvals/page.test.tsx`
- `apps/control-plane-v3/src/app/playbooks/page.test.tsx`
- `apps/control-plane-v3/src/app/runs/page.test.tsx`

影响：

- 新页面的首屏渲染、错误态和基本权限行为仍缺最小回归保护。

### M2. Route-policy tests still do not cover the newly added routes

虽然 `route-policy.ts` 已经补了：

- `/approvals`
- `/playbooks`
- `/runs`

但现有测试仍未增加相应断言。

证据：

- `apps/control-plane-v3/src/lib/route-policy.ts:128`
- `apps/control-plane-v3/src/app/shell-route-integrity.test.ts:26`
- `apps/control-plane-v3/src/lib/route-policy.test.ts:10`

影响：

- 新增路由再次漏配时，当前测试体系仍然很难第一时间发现。

### M3. `approvals`、`playbooks`、`runs` 仍缺少页面级 query-error recovery

虽然三页现在已接入 `ManagementRouteGuard`，但页面内部仍主要依赖通用错误卡片，没有使用统一的 query-level session recovery。

证据：

- `apps/control-plane-v3/src/app/approvals/page.tsx:41`
- `apps/control-plane-v3/src/app/playbooks/page.tsx:39`
- `apps/control-plane-v3/src/app/runs/page.tsx:71`
- `rg -n "useManagementPageSessionRecovery" apps/control-plane-v3/src/app/approvals apps/control-plane-v3/src/app/playbooks apps/control-plane-v3/src/app/runs` returned no matches

影响：

- 首次进入页面已被守卫保护，但若页面加载后 session 失效或查询被拒绝，用户仍更容易看到通用报错而不是统一恢复提示。

## Page-By-Page Checklist

### `tasks`

已经具备：

- 任务列表
- 任务筛选
- 创建任务
- 反馈录入
- 基本 relogin recovery 测试

仍缺：

- 与 `operator` 角色真正匹配的最小权限版本
- 对 admin-only token/feedback 数据的降级或条件隐藏
- 更明确的 `403` forbidden 体验

### `spaces`

已经具备：

- spaces 列表
- 创建 space
- 添加成员
- review / events / identities 聚合面板
- 页面级测试

仍缺：

- viewer/operator 可读的轻量 spaces 页面
- add-member 成功后的即时列表同步
- 将 admin-only 面板与基础 spaces 能力解耦
- 更清晰的部分失败降级策略

### `identities`

已经具备：

- human / agent 列表与搜索
- token 与 recent events 可视化
- owner 删除 agent
- 页面级测试

仍缺：

- 邀请管理账号 UI
- 禁用管理账号 UI
- 创建 agent UI
- 签发 token UI
- 撤销 token UI
- “Refresh Snapshot” 的完整刷新链

### `approvals`

已经具备：

- 审批列表
- 状态筛选
- approve / reject
- 路由守卫

仍缺：

- 页面级 smoke test
- query-level session recovery
- 更细的 forbidden / conflict 错误表现

### `playbooks`

已经具备：

- 搜索
- task type / tag 筛选
- 详情查看
- 创建 playbook
- 路由守卫

仍缺：

- 页面级 smoke test
- query-level session recovery

### `runs`

已经具备：

- runs 列表
- 状态筛选
- run 详情查看
- 路由守卫

仍缺：

- 页面级 smoke test
- query-level session recovery

## Final Verdict

当前状态的核心结论是：

1. 基础认证和类型层问题相比上一轮已经明显收敛。
2. 但前后端仍未达到“完美对接”。
3. 当前剩余问题已集中到三类：
   - 权限边界仍不精确
   - 前端状态同步仍不完整
   - 多个页面仍缺功能入口和最小测试保护

如果按优先级排序，当前最需要关注的是：

1. 先收敛 `/tasks` 与 `/spaces` 的真实权限边界。
2. 再补 `identities` 中后端已存在但前端未暴露的管理动作。
3. 然后补 `403` 与 query-level 页面恢复。
4. 最后补新页面 smoke tests 与 route-policy 测试矩阵。

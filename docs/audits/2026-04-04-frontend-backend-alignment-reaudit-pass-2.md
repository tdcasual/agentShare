# Frontend/Backend Alignment Re-Audit

Date: 2026-04-04
Pass: 2

## Scope

本轮是基于当前工作树的再次重审计，重点复核：

- `tasks`
- `spaces`
- `identities`
- `approvals`
- `playbooks`
- `runs`
- 路由/权限/恢复链：
  - `role-system.ts`
  - `route-policy.ts`
  - `management-session-recovery.tsx`
  - `route-policy.test.ts`
  - `shell-route-integrity.test.ts`

## Verification

本轮实际验证：

```bash
cd apps/control-plane-v3
npm exec tsc -- --noEmit
npm exec vitest run src/lib/route-policy.test.ts src/app/shell-route-integrity.test.ts src/app/approvals/page.test.tsx src/app/playbooks/page.test.tsx src/app/runs/page.test.tsx
```

结果：

- `tsc`: exit code `0`
- `vitest`: `2 passed | 3 skipped`

注意：

- `approvals` / `playbooks` / `runs` 的测试文件已存在
- 但这 3 个文件当前都是 `it.skip(...)` 占位测试，不构成真实 smoke coverage

## Executive Summary

相比上一轮，当前工作树已经继续收敛，但还没有达到“完美对接”。

### 本轮确认已修复 / 已改善

- `/spaces` 的前端角色边界已上调为 `admin`，不再继续把当前复合页伪装成 viewer/operator 页面
- `management-session-recovery` 已能识别 `403`
- `identities` 的 `Refresh Snapshot` 已补齐：
  - admin accounts
  - agents + bulk tokens
  - events
- `identities` 页头已经补了管理入口跳转：
  - `Invite Operator`
  - `Create Agent`
  - `Issue Token`
- `route-policy.test.ts` 已补 `/approvals`、`/playbooks`、`/runs`
- `shell-route-integrity.test.ts` 已补三条页面存在性断言
- `route-policy.ts` 注释已明确与 `role-system.ts` 的分工，不再把自己描述成完整访问控制的唯一来源

### 当前仍然存在的主要问题

1. `/tasks` 仍然是最明显的真实权限偏移
2. `/spaces` 虽然已通过“提升到 admin”规避运行时错位，但前端仍未兑现后端已经支持的低权限只读空间能力
3. `403` 恢复链只修到 hook 层，页面层并没有真正消费 forbidden 态
4. `approvals` / `playbooks` / `runs` 虽然有测试文件，但仍是跳过状态，等同于没有真实 smoke test
5. `identities` 已从“功能完全缺失”收敛为“入口部分补齐但仍不完整”

### Severity Snapshot

- High: 4
- Medium: 3

## Closed Since Previous Audit

### 1. `/spaces` 的前端角色边界已与当前页面实际依赖对齐

当前：

- [`role-system.ts`](../../apps/control-plane-v3/src/lib/role-system.ts)
- [`sidebar.tsx`](../../apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx)

都把 `/spaces` 作为 `admin` 级页面处理。

这意味着：

- 当前复合型 `spaces` 页不会再以 viewer/operator 身份暴露一个必然落 `403` 的入口

但这只是“避免错配”，还不是“兑现后端低权限能力”。

### 2. `identities` 的 snapshot refresh 已补全

当前：

- [`identities/page.tsx`](../../apps/control-plane-v3/src/app/identities/page.tsx)
- [`identity/hooks.ts`](../../apps/control-plane-v3/src/domains/identity/hooks.ts)
- [`event/hooks.ts`](../../apps/control-plane-v3/src/domains/event/hooks.ts)

已经刷新：

- `refreshSession()`
- `refreshAdminAccounts()`
- `refreshAgentsWithTokens()`
- `refreshEvents()`

上一轮关于 “Refresh Snapshot 不刷新 tokens/events” 的问题，本轮关闭。

### 3. `management-session-recovery` 已支持 `403`

当前：

- [`management-session-recovery.tsx`](../../apps/control-plane-v3/src/lib/management-session-recovery.tsx)

新增：

- `isForbiddenError`
- `isAuthError`
- `shouldShowForbidden`
- `ManagementForbiddenAlert`

说明恢复层基础能力已补上，但页面消费仍未跟上。

### 4. 新路由测试矩阵已补基础覆盖

当前：

- [`route-policy.test.ts`](../../apps/control-plane-v3/src/lib/route-policy.test.ts)
- [`shell-route-integrity.test.ts`](../../apps/control-plane-v3/src/app/shell-route-integrity.test.ts)

都已覆盖：

- `/approvals`
- `/playbooks`
- `/runs`

上一轮关于“路由测试矩阵完全缺失这三条路由”的问题，本轮关闭。

## High-Severity Findings

### H1. `/tasks` 仍然不是一个真实可用的 `operator` 页面

当前路由角色仍是：

- `/tasks` => `operator`

但页面依赖仍包含 admin-only 能力：

- [`tasks/page.tsx`](../../apps/control-plane-v3/src/app/tasks/page.tsx)
- [`hooks-dashboard.ts`](../../apps/control-plane-v3/src/domains/task/hooks-dashboard.ts)
- [`agents.py`](../../apps/api/app/routes/agents.py)
- [`agent_tokens.py`](../../apps/api/app/routes/agent_tokens.py)
- [`token_feedback.py`](../../apps/api/app/routes/token_feedback.py)

影响：

- `operator` 仍可能进入页面后在组合查询阶段落入 `403`
- 现在只是把这个偏移写进了页面注释，还没有真正收敛产品行为

结论：

- 这是当前最核心、最真实的前后端权限偏移

### H2. `/spaces` 不再“错开放”，但仍没有兑现后端低权限空间能力

后端当前支持：

- `GET /api/spaces`
- `GET /api/spaces/{id}`

=> any management session

但当前前端策略是：

- 直接把整个 `spaces` 复合页提升到 `admin`

证据：

- [`spaces/page.tsx`](../../apps/control-plane-v3/src/app/spaces/page.tsx)
- [`spaces.py`](../../apps/api/app/routes/spaces.py)
- [`role-system.ts`](../../apps/control-plane-v3/src/lib/role-system.ts)

影响：

- 运行时错位减少了
- 但后端已经存在的 viewer/operator 可读基础能力，前端仍无对应产品形态

结论：

- 这是从“权限错配”演化成了“前端功能缺口”

### H3. `403` 恢复链只修到 hook，页面层仍没有真正展示 forbidden 态

当前 hook 已支持：

- `shouldShowForbidden`
- `ManagementForbiddenAlert`

但页面层搜索结果显示：

- `tasks`
- `spaces`
- `identities`
- `approvals`
- `playbooks`
- `runs`

都没有实际消费这些 forbidden UI 状态。

证据：

- [`management-session-recovery.tsx`](../../apps/control-plane-v3/src/lib/management-session-recovery.tsx)
- `rg -n "shouldShowForbidden|ManagementForbiddenAlert" ...` 仅命中 `route-guard.tsx`

影响：

- query-level `403` 仍会被压平为通用错误
- 用户仍难以分辨“权限不足”和“系统异常”

### H4. `approvals` / `playbooks` / `runs` 的测试仍然是占位文件，不是有效 smoke tests

当前文件虽已存在：

- [`approvals/page.test.tsx`](../../apps/control-plane-v3/src/app/approvals/page.test.tsx)
- [`playbooks/page.test.tsx`](../../apps/control-plane-v3/src/app/playbooks/page.test.tsx)
- [`runs/page.test.tsx`](../../apps/control-plane-v3/src/app/runs/page.test.tsx)

但三者都只是：

- `it.skip('renders the ... page', ...)`

影响：

- 测试看起来“有文件”
- 但 CI 实际没有覆盖这三页的首屏、错误态、空态、关键交互

结论：

- 从回归保护角度，这三页仍然等同于“没有 smoke tests”

## Medium-Severity Findings

### M1. `spaces` 的 add-member 刷新只补齐了未过滤列表，agent-filtered 列表仍可能不更新

当前 `useSpaces()` 的 key：

- 无过滤：`/spaces`
- 有 `agentId`：`/api/spaces?agent_id=...`

当前 `useAddSpaceMember()` 成功后只刷新：

- `/spaces/{spaceId}`
- `/spaces`

证据：

- [`space/hooks.ts`](../../apps/control-plane-v3/src/domains/space/hooks.ts)

影响：

- 若页面处于按 agent 聚焦的过滤态，当前列表 key 可能仍不被刷新
- 这属于“刷新链修了一半”

### M2. `identities` 现在已有管理入口，但仍不是完整管理页

当前页头已补跳转入口：

- Invite Operator -> `/settings`
- Create Agent -> `/tokens`
- Issue Token -> `/tokens`

但仍未补：

- disable admin account 的直接入口
- revoke token 的直接入口
- 页内一体化管理流

证据：

- [`identities/page.tsx`](../../apps/control-plane-v3/src/app/identities/page.tsx)
- [`human-operators-section.tsx`](../../apps/control-plane-v3/src/app/identities/human-operators-section.tsx)
- [`agent-management-card.tsx`](../../apps/control-plane-v3/src/app/identities/agent-management-card.tsx)

影响：

- 这已经不是“全前端缺功能”
- 但如果产品仍把它定位为 `Identity Management` 主管理页，当前能力仍然不完整

### M3. `approvals` / `playbooks` / `runs` 仍未接入 query-level session recovery

当前这三页仍主要使用各自的加载/错误卡片，没有接入：

- `useManagementPageSessionRecovery`

影响：

- 页面虽然受路由守卫保护
- 但查询阶段的 `401/403` 仍无统一恢复体验

## Final Verdict

这轮再次审计后的结论可以概括为：

1. 上一轮里最明显的“结构性错位”有几项已经继续收敛：
   - `/spaces` 路由角色
   - `identities` refresh
   - 路由测试矩阵
   - `403` 基础 hook 能力
2. 但当前还剩三类没有收口：
   - `/tasks` 的真实权限错位
   - `/spaces` / `identities` 的产品能力缺口
   - forbidden 态与新页面 smoke tests 仍停留在“半接好”状态
3. 如果按优先级排序，本轮最值得继续追的是：
   - 先解决 `/tasks`
   - 再定义 `/spaces` 低权限视图
   - 然后把 `403` UI 和真实 smoke tests 补完整

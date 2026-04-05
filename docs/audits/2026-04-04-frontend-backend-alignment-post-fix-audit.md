# Frontend/Backend Alignment Post-Fix Audit

Date: 2026-04-04
Status: post-fix re-audit

## Scope

本轮基于修复后的当前工作树复审以下页面与权限链路：

- `tasks`
- `spaces`
- `identities`
- `approvals`
- `playbooks`
- `runs`
- 路由与权限基础设施：
  - `src/lib/role-system.ts`
  - `src/interfaces/human/layout/sidebar.tsx`
  - `src/lib/management-session-recovery.tsx`

## Verification

实际执行：

```bash
cd apps/control-plane-v3
npm exec tsc -- --noEmit
npm exec vitest run \
  src/lib/role-system.test.ts \
  src/lib/route-policy.test.ts \
  src/app/shell-route-integrity.test.ts \
  src/domains/space/hooks.test.ts \
  src/app/tasks/page.test.tsx \
  src/app/spaces/page.test.tsx \
  src/app/identities/page.test.tsx \
  src/app/approvals/page.test.tsx \
  src/app/playbooks/page.test.tsx \
  src/app/runs/page.test.tsx
```

结果：

- `tsc`: exit code `0`
- `vitest`: `15 passed (15), 116 passed (116)`

## Executive Summary

本轮修复后，前端与后端在本次审计范围内已不再存在阻断级权限偏移。

已确认关闭的核心问题：

- `/tasks` 不再以 `operator` 入口暴露一个实际依赖 admin 数据面的页面
- `/spaces` 已兑现“viewer 可读、operator 可写、admin 面板额外可见”的分层行为
- `401/403` 恢复链已经从 hook 层落到页面层，`tasks`、`spaces`、`identities`、`approvals`、`playbooks`、`runs` 都能区分会话过期与权限不足
- `identities` 已补足明确的账号/令牌管理 handoff
- `approvals`、`playbooks`、`runs` 不再是 `it.skip` 占位测试，已经具备基础 smoke coverage
- `tokens` 的 create / mint / revoke 三条 mutation 已接入鉴权恢复
- `spaces` 的 create / add-member 已接入鉴权恢复，forbidden 态不再叠加通用错误卡

结论：

- 当前审计范围内，没有发现新的 High-Severity 对接偏移
- 当前剩余问题主要集中在“测试覆盖深度”与“页面职责仍偏复合”两个方向

## Closed Findings

### 1. `/tasks` 路由角色与实际依赖已重新对齐

当前：

- `src/lib/role-system.ts`
- `src/interfaces/human/layout/sidebar.tsx`

都将 `/tasks` 视为 `admin` 页面。

这与页面对 agent/token/feedback 相关数据的依赖保持一致，已关闭此前“operator 能进入但页面实际会撞 admin-only API”的核心偏移。

### 2. `/spaces` 已从“混合错位”收敛为“低权限只读 + 高权限扩展”

当前：

- `/spaces` 路由角色为 `viewer`
- `spaces` 基础列表继续可读
- create/add-member 仅 `operator+`
- events/reviews/agents/secrets/capabilities 面板仅 `admin+`
- 非 admin 时相关查询已暂停，不再继续发起 admin-only 请求

这使前端行为与后端：

- `GET /api/spaces*` 任意 management session 可读
- `POST /api/spaces*` 仅 operator+

保持一致。

### 3. Forbidden 恢复已真正落到页面层

当前页面：

- `tasks`
- `spaces`
- `identities`
- `approvals`
- `playbooks`
- `runs`

都已经消费：

- `ManagementSessionExpiredAlert`
- `ManagementForbiddenAlert`
- `useManagementPageSessionRecovery`

此前“403 被压平成通用错误”的问题已关闭。

### 4. `identities` 的手动管理 handoff 已补齐

当前已存在明确跳转：

- 人类账号详情可进入 `/settings`
- agent 卡片可进入 `/tokens`
- 页头 CTA 已具备 Invite / Create / Issue / Disable 几类入口

此前“前端没有把账号/令牌管理职责交代清楚”的问题已关闭。

### 5. 三个薄弱页面已有真实 smoke tests

当前以下文件已不再是占位：

- `src/app/approvals/page.test.tsx`
- `src/app/playbooks/page.test.tsx`
- `src/app/runs/page.test.tsx`

虽然覆盖深度仍有限，但已经从“无有效保护”提升到“首屏/空态/forbidden 基础受保护”。

### 6. `/tokens` 的写操作已与页面级鉴权恢复对齐

当前已确认：

- create agent
- mint token
- revoke token

三条 mutation 在 `401/403` 下都会优先进入：

- `ManagementSessionExpiredAlert`
- `ManagementForbiddenAlert`

而不再落入通用表单错误。

这关闭了此前“列表查询已支持恢复，但写操作仍可能表现为普通提交失败”的行为偏移。

### 7. `/spaces` 的 mutation 与 forbidden 呈现已进一步收敛

当前已确认：

- create space
- add member

都已接入 `consumeUnauthorized()`。

同时 forbidden 态下：

- 保留明确的 `ManagementForbiddenAlert`
- 不再额外叠加 `gateError` 通用错误卡

这关闭了此前“低权限状态提示正确，但局部操作和错误呈现仍不一致”的残余偏移。

## Remaining Findings

### M1. 关键交互已有 smoke 覆盖，但仍缺端到端级联保护

当前已覆盖：

- 基础渲染
- 空态
- forbidden 恢复
- `spaces`/`identities` 的部分交互

本轮已补：

- `tasks`: publish / feedback 的 session-expired 恢复
- `approvals`: approve / reject 基础操作回路
- `approvals`: action failure / session-expired 恢复
- `approvals`: refresh failure / session-expired 恢复
- `playbooks`: 详情打开、create modal submit
- `playbooks`: create failure / session-expired 恢复
- `playbooks`: refresh failure / session-expired 恢复
- `runs`: 状态筛选、详情弹窗
- `runs`: refresh failure / session-expired 恢复
- `spaces`: create space、add member
- `reviews` / `tokens` / `assets` / `settings` / `marketplace`: forbidden-specific 恢复

但以下仍缺少更强保护：

- action 失败态与 toast/错误提示的一致性
- 跨 hook 刷新后的 UI 再同步断言
- 多页面联动的端到端回归

这不再是前后端对接偏移，但仍是回归保护缺口。

### M2. `/spaces` 仍是一个复合职责页面，后续继续演化时容易再次漂移

本轮通过“按角色隐藏并暂停查询”已经把行为对齐。

但页面仍同时承载两层职责：

- viewer/operator 的 persisted spaces 基础视图
- admin 的 operations/governance/identity/market inventory 扩展视图

这意味着后续再往该页添加模块时，如果忘记同步做角色门控与 query pause，仍有再次出现权限漂移的风险。

当前这属于架构脆弱点，不是现存功能错误。

## Current Smoke Test Inventory

本轮确认存在并通过的对齐/冒烟测试：

- `src/lib/role-system.test.ts`
- `src/lib/route-policy.test.ts`
- `src/app/shell-route-integrity.test.ts`
- `src/domains/space/hooks.test.ts`
- `src/app/tasks/page.test.tsx`
- `src/app/spaces/page.test.tsx`
- `src/app/identities/page.test.tsx`
- `src/app/approvals/page.test.tsx`
- `src/app/playbooks/page.test.tsx`
- `src/app/runs/page.test.tsx`
- `src/app/reviews/page.test.tsx`
- `src/app/tokens/page.test.tsx`
- `src/app/assets/page.test.tsx`
- `src/app/settings/page.test.tsx`
- `src/app/marketplace/page.test.tsx`

其中已覆盖的关键对齐点包括：

- 路由角色矩阵
- 侧边栏/路由存在性
- `/spaces` viewer 只读降级
- `/spaces` create space / add member 基础回路
- `/spaces` forbidden 与 session-expired 恢复
- `/spaces` create / add-member 的 unauthorized 恢复与 forbidden 去重
- `/identities` 局部失败不拖垮整页
- `/identities` 管理 handoff 链接
- `/tasks` publish / feedback 的 session-expired 恢复
- `/approvals` approve / reject / action error / forbidden / session-expired 状态
- `/approvals` refresh error / refresh session-expired 状态
- `/playbooks` detail / create / action error / forbidden / session-expired 状态
- `/playbooks` refresh error / refresh session-expired 状态
- `/runs` filter / detail / refresh error / refresh session-expired / forbidden-specific 状态
- `/tokens` create / mint / revoke 的 unauthorized / forbidden 恢复
- `/reviews` / `/tokens` / `/assets` / `/settings` / `/marketplace` 的 forbidden-specific 状态

## Final Assessment

修复后的当前版本可以判定为：

- 前后端核心权限边界已基本对齐
- 本轮审计范围内未发现新的阻断级偏移
- 本次增量复审未再发现新的 management-page mutation 恢复遗漏
- 仍建议下一轮优先补足 action-flow smoke tests，避免后续重构时再次把“页面可进但操作不可用”带回来

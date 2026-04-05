# Frontend Gap Closure Backlog

Date: 2026-04-04

Source audit:

- [`2026-04-04-frontend-backend-alignment-reaudit.md`](../audits/2026-04-04-frontend-backend-alignment-reaudit.md)

## Prioritization Rules

- `P0`: 会直接导致页面权限边界错误、用户进入后即出现结构性 `403`、或产品定位与页面能力严重不符
- `P1`: 不会阻断所有流程，但会造成错误感知、数据不同步、或核心操作结果不可信
- `P2`: 测试补齐、恢复链一致性、维护性防护

## P0

### P0-1. 重新定义 `/tasks` 的真实权限边界

- Owner suggestion: `frontend + backend + product`
- Scope:
  - 明确 `/tasks` 到底是 `operator` 任务面板，还是 `admin` 运营面板
  - 对齐页面角色、组合查询、反馈动作
- Current gap:
  - 页面按 `operator` 开放，但依赖 admin-only agents/tokens/feedback API
- Acceptance criteria:
  - 若保留 `operator`：
    - 页面首屏不依赖 admin-only 数据
    - admin-only 模块可隐藏或降级
    - `operator` 进入页面不会被结构性 `403` 卡住
  - 若改为 `admin`：
    - 路由角色、导航入口、页面文案、测试全部同步调整
- Dependencies:
  - 产品确认 `/tasks` 的目标用户
  - 后端确认哪些数据必须面向 `operator` 开放，哪些不开放

### P0-2. 拆开 `/spaces` 的基础空间视图与 admin 运营面板

- Owner suggestion: `frontend + product`
- Scope:
  - 把基础 `spaces` 可读能力与 events/reviews/agents/secrets 等 admin 面板解耦
- Current gap:
  - 后端 any-session 可读，前端仍是 admin-heavy 聚合页
- Acceptance criteria:
  - 任意 management session 至少能稳定看到基础 space list/detail
  - admin-only 面板可以单独展示、延迟加载、或拆页展示
  - 页面不会因一个 admin-only 查询失败而整体失效
- Dependencies:
  - 产品确认轻量 spaces 视图的信息范围

### P0-3. 决定 `identities` 的产品定位，并收敛入口

- Owner suggestion: `frontend + product`
- Scope:
  - 决定 `identities` 是“完整身份管理枢纽”还是“身份观测页”
- Current gap:
  - invite/disable admin account 在 `settings`
  - create agent / issue token / revoke token 在 `tokens`
  - `identities` 标题是 management，但动作并未聚合
- Acceptance criteria:
  - 若定义为“管理枢纽”：
    - `identities` 提供 invite / disable / create / issue / revoke 的入口或内嵌流
  - 若定义为“观测页”：
    - 页面标题、描述、CTA、跳转关系明确表达“去 settings/tokens 完成管理动作”
  - 用户不需要靠猜测去寻找身份域操作入口
- Dependencies:
  - 产品确定最终 IA

## P1

### P1-1. 把 `403` 纳入统一的页面恢复链

- Owner suggestion: `frontend`
- Scope:
  - 统一 `401` 与 `403` 的页面级处理策略
- Current gap:
  - `useManagementPageSessionRecovery` 只识别 `401`
- Acceptance criteria:
  - 页面能区分：
    - session 失效
    - 权限不足
    - 系统异常
  - 用户看到的提示与真实状态一致
- Dependencies:
  - 无

### P1-2. 修复 `spaces` add-member 后的缓存刷新链

- Owner suggestion: `frontend`
- Scope:
  - 让添加成员后的当前列表视图立即与后端一致
- Current gap:
  - mutate 的 key 与页面消费的 key 不一致
- Acceptance criteria:
  - add-member 成功后，当前 list UI 无需手动刷新即可看到新成员
  - agent-filtered 与 unfiltered list 都能正确更新
- Dependencies:
  - 无

### P1-3. 补全 `identities` 的 snapshot refresh

- Owner suggestion: `frontend`
- Scope:
  - 把当前页面实际依赖的所有 key 纳入 refresh
- Current gap:
  - 只刷新 session / admin accounts / agents，未刷新 bulk tokens / events
- Acceptance criteria:
  - “Refresh Snapshot” 后：
    - admin account 变化刷新
    - agent 列表刷新
    - token coverage 刷新
    - recent feedback/event 指标刷新
- Dependencies:
  - 无

### P1-4. 给 `approvals` 补更细的权限/冲突错误表达

- Owner suggestion: `frontend`
- Scope:
  - 区分 `403`、`404`、`409`
- Current gap:
  - 当前多为通用错误卡片
- Acceptance criteria:
  - 用户能知道是“无权审批”还是“审批状态已变化”
  - 冲突后可以快速 refresh/retry
- Dependencies:
  - 无

## P2

### P2-1. 为 `approvals`、`playbooks`、`runs` 补页面级 smoke tests

- Owner suggestion: `frontend test`
- Scope:
  - 最小渲染/空态/错误态/关键交互回归
- Acceptance criteria:
  - 三页均有 `page.test.tsx`
  - 覆盖至少：
    - basic render
    - empty state
    - error state
    - refresh or primary action wiring

### P2-2. 补齐新路由的测试矩阵

- Owner suggestion: `frontend test`
- Scope:
  - `route-policy`
  - `shell route integrity`
  - 如有需要，补 `role-system` 断言
- Acceptance criteria:
  - `/approvals`
  - `/playbooks`
  - `/runs`
  均进入测试覆盖
  - 至少校验：
    - route exists
    - auth policy exists
    - page file exists
    - role requirement matches expectation

### P2-3. 为 `approvals`、`playbooks`、`runs` 接入统一 query-level recovery

- Owner suggestion: `frontend`
- Scope:
  - 页面内部错误态统一到 `useManagementPageSessionRecovery`
- Acceptance criteria:
  - 这三页在 query 失败时能统一处理 session-expired / forbidden / generic error
  - 页面体验与 `tasks`、`spaces`、`identities` 保持一致

### P2-4. 收敛前端访问控制的“单一真实来源”

- Owner suggestion: `frontend architecture`
- Scope:
  - 明确 `route-policy.ts` 与 `role-system.ts` 的边界
- Current gap:
  - 注释声称单一真实来源，实际已拆为两处
- Acceptance criteria:
  - 新增路由时只需遵循一个清晰约定
  - 测试能覆盖 authenticated policy + role policy
  - 文档/注释与实际结构一致

## Recommended Execution Order

1. 先做 `P0-1` 与 `P0-2`
2. 再做 `P0-3`
3. 然后处理 `P1-1`、`P1-2`、`P1-3`
4. 最后补 `P1-4` 与全部 `P2`

## Suggested Owners By Area

- Frontend:
  - `/spaces` 解耦
  - `identities` IA 收敛
  - `403` / recovery / cache refresh
- Backend:
  - 仅在需要为 `operator` 提供额外读取能力时参与
- Product:
  - 决定 `/tasks` 与 `identities` 的目标用户和页面定位
- Test:
  - smoke tests
  - route matrix

## Done Definition

本 backlog 可以视为完成，当且仅当：

1. `/tasks` 与 `/spaces` 的页面可访问边界和后端真实权限一致。
2. `identities` 的产品定位与入口设计不再自相矛盾。
3. `401/403`、缓存刷新、页面 smoke tests 对六个重点页面都有最小保护。

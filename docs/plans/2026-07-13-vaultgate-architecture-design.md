# VaultGate 目标架构设计

日期：2026-07-13
状态：已确认（基线版本）
范围：产品定位、数据模型、认证授权、API、事务、管理界面、迁移与验收。

> **状态说明（2026-08-20）**：本文为 2026-07-13 基线设计，不包含 Vault Spaces（2026-07-20 上线，迁移 `20260730_01_vault_spaces.py`）。Spaces 的目标、数据模型与授权语义见 [`2026-08-20-vault-spaces-design.md`](./2026-08-20-vault-spaces-design.md)。本文与代码/测试冲突时，以代码与测试为准。

## 1. 产品定位

VaultGate 是一个小型、自托管、单租户的凭据网关。系统只有一个管理员控制面，但允许创建多个 Agent；每个 Agent 可以拥有多个 Token，每个 Token 独立配置可访问的 Secret 集合。

核心闭环：

```text
管理员初始化并登录
→ 保存加密 Secret
→ 创建 Agent
→ 为 Agent 签发一个或多个 Token
→ 为每个 Token 显式授权 Secret
→ Agent 使用 Token 读取授权内容
→ 管理员查看审计、调整授权、轮换或撤销 Token
```

系统优先级依次为：安全正确性、鲁棒性、可审计性、代码清晰度、运维可恢复性、界面体验。功能数量不是目标。

## 2. 非目标

不实现以下能力：

- SaaS 多租户和组织隔离；
- 多管理员角色与复杂 RBAC；
- Agent 心跳、在线状态和任务编排；
- 审批流、事件总线、插件系统和工作流；
- 按标签动态扩权、通配符授权或继承权限；
- 旧 Agent Control Plane API、类型和前端兼容层。

标签仅用于管理员搜索和批量选择。实际权限始终落为 Token 与具体 Secret 的逐条授权，标签变化不会自动扩大权限。

## 3. 信任边界

可信主体：

- 部署者提供的生产配置和加密密钥；
- 已通过服务端验证且未撤销的管理员 Session；
- 已通过服务端验证且未撤销的管理 Token。

不可信主体：

- Agent Token 和所有运行时请求；
- 浏览器 Cookie 内容、请求参数、代理头和客户端 IP；
- 数据库中可能被篡改或损坏的数据；
- 外部网络、反向代理之外的直接请求和重试。

系统保证数据库泄露不直接暴露 Secret 明文，Token 泄露影响受授权、TTL 和撤销限制，会话可过期和撤销，所有敏感操作有可靠审计。系统不试图在宿主机或应用进程已被完全控制后继续保护运行时明文。

## 4. 数据模型

```text
AdminUser 1 ── * AdminSession
AdminUser 1 ── * ManagementToken
AdminUser 1 ── * Secret
AdminUser 1 ── * Agent
Agent     1 ── * AgentToken
AgentToken * ── * Secret  (TokenSecretGrant)
AuditLog  → actor + resource snapshots
```

### 4.1 AdminUser

单管理员账号。数据库约束必须保证最多只有一个管理员。管理员可以通过浏览器 Session 或管理 Token 调用相同的管理 API。

### 4.2 AdminSession

保存随机 Session Token 的 SHA-256 哈希、签发时间、过期时间、撤销时间、最后使用时间和必要的客户端信息。浏览器只持有原始随机值；logout 在服务端撤销 Session。

### 4.3 ManagementToken

管理自动化使用，原文前缀为 `vgm_`。支持多个具名 Token、TTL、撤销、轮换和最后使用时间。数据库只保存哈希，原文只在创建或轮换成功后返回一次。首版所有管理 Token 均拥有完整管理员能力，但不能创建第二个管理员或绕过单管理员约束。

### 4.4 Agent

逻辑运行时身份，包含名称、说明、`active/disabled` 状态和时间信息。Agent 不能登录后台。停用 Agent 立即使其所有 Token 无效，但不删除 Token 和历史审计。

### 4.5 AgentToken

属于一个 Agent，原文前缀为 `vg_`。每个 Agent 可拥有多个 Token；Token 独立设置名称、说明、TTL、状态和最后使用时间。Token 只用于 `/api/vault/*`，不能调用管理 API。

### 4.6 Secret

保存名称、类型、URL、用户名、说明、标签、非敏感 metadata 和加密值。加密载荷带版本号/密钥版本，为平滑轮换加密密钥保留能力。普通列表和详情不返回明文。

### 4.7 TokenSecretGrant

明确记录一个 Agent Token 对一个 Secret 的访问授权。数据库唯一约束 `(token_id, secret_id)`，缺少记录即拒绝。删除 Secret 或 Token 时授权自动删除。

### 4.8 AuditLog

不可变安全事件。记录 actor 类型与快照、资源类型与快照、动作、结果、拒绝原因、IP、User-Agent、request ID、时间和安全的 metadata。删除 Agent、Token 或 Secret 后审计仍可理解，不依赖外键对象继续存在。

## 5. 后端架构

采用模块化单体，不引入微服务、消息队列、通用 Repository、事件总线或依赖注入框架。

```text
FastAPI
├─ bootstrap      首次初始化
├─ admin_auth     Session 与 vgm_ 管理 Token
├─ agents         Agent 生命周期
├─ secrets        Secret 管理与加密
├─ tokens         Agent Token 签发、轮换、撤销
├─ grants         Token–Secret 授权
├─ vault          Agent 运行时读取
└─ audit          审计写入、查询与聚合
```

每个模块最多三层：

- Route：HTTP 参数、认证依赖、状态码和 DTO；
- Service：业务规则、权限判断和事务边界；
- Model：SQLAlchemy 映射和数据库约束。

统一使用异步 SQLAlchemy。应用运行时不再同时维护同步和异步两套引擎；Alembic 可继续独立使用同步连接执行迁移。

## 6. API 设计

不保留旧管理路径或响应兼容层。管理接口统一使用：

```text
GET|POST        /api/admin/bootstrap/*
GET|POST|DELETE /api/admin/session/*
GET|POST        /api/admin/management-tokens
POST            /api/admin/management-tokens/{id}/rotate
DELETE          /api/admin/management-tokens/{id}
GET|POST        /api/admin/secrets
GET|PATCH|DELETE /api/admin/secrets/{id}
GET             /api/admin/secrets/{id}/value
GET|POST        /api/admin/agents
GET|PATCH|DELETE /api/admin/agents/{id}
GET|POST        /api/admin/agents/{id}/tokens
POST            /api/admin/tokens/{id}/rotate
DELETE          /api/admin/tokens/{id}
GET|PUT         /api/admin/tokens/{id}/grants
GET             /api/admin/audit-logs
GET             /api/admin/audit-stats
```

Agent 运行时统一使用：

```text
GET /api/vault/me
GET /api/vault/secrets
GET /api/vault/secrets/{id}
GET /api/vault/secrets/{id}/value
```

首版不提供 batch runtime API，除非存在明确调用需求。文档中当前不存在的 batch、`fields=` 和旧路径全部删除。

管理员认证支持两种方式：

- 浏览器：HttpOnly Session Cookie；
- 自动化：`Authorization: Bearer vgm_...`。

两者解析成统一 `AdminPrincipal`，业务服务不区分 UI 与 API。`vg_` Agent Token 调用 `/api/admin/*` 必须返回 401；`vgm_` 管理 Token 调用 `/api/vault/*` 也必须返回 401。

所有响应使用稳定 DTO 和错误码。前端 TypeScript 类型由 OpenAPI 生成或在构建时做契约验证，不再手工维护伪响应结构。

## 7. 事务与审计

事务边界由 service 明确控制：

- 创建 Token 与可选初始授权在同一事务成功后，才返回一次性 Token 原文；
- 授权更新使用集合替换语义和唯一约束，重复请求幂等；
- Vault 成功读取必须在返回明文前持久化访问审计；审计失败则不返回明文；
- 拒绝访问审计使用独立事务，不能随 401/403 的业务事务 rollback；
- 创建、修改、删除 Secret，创建/停用 Agent，签发/轮换/撤销 Token，修改授权和读取管理员明文均写管理审计；
- 审计内容绝不包含 Secret 明文、Token 原文、密码或完整 Authorization/Cookie。

创建型管理接口支持 `Idempotency-Key`。实现应聚焦 Agent、Token、Secret 和授权等会产生重复资源的操作，不恢复旧项目的通用幂等中间件框架。

## 8. 安全规则

- 所有授权默认拒绝；
- 401 表示凭据本身无效、过期、撤销或主体停用；
- 403 表示有效 Agent Token 没有目标 Secret 权限；
- 运行时错误不泄露 Secret 是否存在；
- Cookie 使用 `HttpOnly + Secure + SameSite=Lax`，生产配置 fail-fast；
- 登录限流按可信代理解析后的客户端 IP 与管理员账号组合计算；
- Token 和 Session 原文只展示一次且数据库仅存哈希；
- Secret 明文响应使用 `Cache-Control: no-store`；
- Secret 明文不进入普通列表、前端持久缓存、日志和审计 metadata；
- 所有列表有输入上限、稳定排序和分页；
- 数据库、迁移或加密初始化失败时服务 fail-fast/readiness 失败。

## 9. 管理界面

顶级导航：

```text
概览 / 密钥 / Agent / 审计
```

Token 归属 Agent 详情，不作为独立顶级导航。Agent 详情展示状态、说明、最近活动、Token 列表和关联审计。每个 Token 支持签发、一次性复制、轮换、撤销、TTL 和 Secret 授权集合。

Secret 页面支持创建、编辑、删除、标签、搜索和显式临时显示明文。审计页面支持按 Agent、Token、Secret、actor、action、result 和时间范围筛选，统计由后端聚合。

首次使用流程：

```text
setup → login → 创建 Secret → 创建 Agent
→ 签发并授权 Token → 展示可直接使用的 curl 示例
```

前端只访问同源 `/api`。删除 `NEXT_PUBLIC_API_BASE_URL` 分叉、旧 role store、role system、伪 `ManagementSessionSummary`、不可达状态和旧路径兼容代码。

## 10. 数据迁移

API 和前端兼容层全部删除，但默认保护现有 VaultGate 数据：

- 现有 User 转为唯一 AdminUser；
- 现有 Secret 保留；
- 现有 Token 为每个不同 Token 创建或归入一个迁移 Agent；
- 现有 Scope 迁移为 TokenSecretGrant；
- 现有 AuditLog 尽可能补充快照字段，无法还原的信息明确标为 legacy migration；
- 迁移前必须自动备份并提供验证查询；
- 不自动删除或重置生产数据库。

如果确认当前部署没有需保留的数据，可另行提供显式 `fresh install` 流程，但不能把破坏性清库作为升级默认行为。

## 11. 验收标准

核心纵向 E2E：

```text
首次初始化 → 登录 → 创建 Secret → 创建 Agent
→ 签发两个不同 Token → 分别授予不同 Secret
→ 验证相互不可见 → 读取授权 Secret → 查询审计
→ 撤销一个 Token → 该 Token 立即 401，另一个不受影响
→ 停用 Agent → 其余 Token 全部立即 401
```

必须覆盖：并发初始化、Session 过期与 logout 撤销、管理 Token 认证隔离、Token TTL、Agent 停用、授权幂等、越权、拒绝审计持久化、审计失败关闭、加密失败、分页、代理限流、迁移、备份恢复和部署回滚。

## 12. 重构原则

这是一次聚焦式架构收敛，不是完全重写：

- 保留 FastAPI、PostgreSQL、Next.js、现有可复用 UI 组件和 AES-GCM 基础；
- 允许重做认证、数据模型、路由、service、前端状态和测试；
- 删除旧兼容层，不为旧错误契约增加适配器；
- 每个行为先写失败测试，再做最小实现；
- 分阶段保持仓库可构建、可迁移和可回滚；
- 不在安全与核心流程稳定前继续视觉重构。

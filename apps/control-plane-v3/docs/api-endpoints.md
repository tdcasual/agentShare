# API Endpoints Reference

## 前端 API 调用约定

### 基础配置
- `apiFetch` 函数自动添加 `/api` 前缀
- 所有 API 调用应**不包含** `/api` 前缀
- 浏览器始终调用同域 `/api/*`
- Next.js 代理负责把这些请求转发到后端真实的 `/api/*` 路由
- `BACKEND_API_URL` 可以是 `http://localhost:8000`，也可以是 `http://localhost:8000/api`
- 代理层必须保证最终目标地址始终只包含一层 `/api`

### 示例
```typescript
// ✅ 正确
apiFetch('/agents')           // 实际调用: /api/agents
apiFetch('/session/login')    // 实际调用: /api/session/login

// ❌ 错误（会导致双重 /api）
apiFetch('/api/agents')       // 实际调用: /api/api/agents ❌
```

---

## Identity Domain

| 功能 | 前端调用 | 实际端点 |
|------|----------|----------|
| Bootstrap 状态 | `/bootstrap/status` | `/api/bootstrap/status` |
| Setup Owner | `/bootstrap/setup-owner` | `/api/bootstrap/setup-owner` |
| Login | `/session/login` | `/api/session/login` |
| Logout | `/session/logout` | `/api/session/logout` |
| Get Session | `/session/me` | `/api/session/me` |
| List Agents | `/agents` | `/api/agents` |
| Create Agent | `/agents` | `/api/agents` |
| List Admin Accounts | `/admin-accounts` | `/api/admin-accounts` |
| Create Admin Account | `/admin-accounts` | `/api/admin-accounts` |
| Disable Admin Account | `/admin-accounts/{id}/disable` | `/api/admin-accounts/{id}/disable` |
| List Agent Tokens | `/agents/{id}/tokens` | `/api/agents/{id}/tokens` |
| Create Agent Token | `/agents/{id}/tokens` | `/api/agents/{id}/tokens` |
| Revoke Agent Token | `/agent-tokens/{id}/revoke` | `/api/agent-tokens/{id}/revoke` |

---

## Asset Domain

| 功能 | 前端调用 | 实际端点 |
|------|----------|----------|
| List Assets | `/assets` | `/api/assets` |
| Create Asset | `/assets` | `/api/assets` |
| Update Asset | `/assets/{id}` | `/api/assets/{id}` |
| Delete Asset | `/assets/{id}` | `/api/assets/{id}` |
| Submit for Review | `/assets/{id}/submit-for-review` | `/api/assets/{id}/submit-for-review` |
| Review Asset | `/assets/{id}/review` | `/api/assets/{id}/review` |

---

## Task Domain

| 功能 | 前端调用 | 实际端点 |
|------|----------|----------|
| List Tasks | `/tasks` | `/api/tasks` |
| Create Task | `/tasks` | `/api/tasks` |
| List Runs | `/runs` | `/api/runs` |
| Create Feedback | `/task-targets/{id}/feedback` | `/api/task-targets/{id}/feedback` |
| Get Token Feedback | `/agent-tokens/{id}/feedback` | `/api/agent-tokens/{id}/feedback` |

---

## Review Domain

| 功能 | 前端调用 | 实际端点 |
|------|----------|----------|
| List Reviews | `/reviews` | `/api/reviews` |
| Approve | `/reviews/{kind}/{id}/approve` | `/api/reviews/{kind}/{id}/approve` |
| Reject | `/reviews/{kind}/{id}/reject` | `/api/reviews/{kind}/{id}/reject` |

---

## Governance Domain

| 功能 | 前端调用 | 实际端点 |
|------|----------|----------|
| List Secrets | `/secrets` | `/api/secrets` |
| Create Secret | `/secrets` | `/api/secrets` |
| List Capabilities | `/capabilities` | `/api/capabilities` |
| Create Capability | `/capabilities` | `/api/capabilities` |

---

## 修复记录

### 修复代理目标前缀归一化
**问题**: 代理曾直接拼接 `${BACKEND_API_URL}/${path}`，当后端真实管理路由挂在 `/api/*` 下时，会错误请求缺少 `/api` 前缀的地址

**修复**:
- `http://localhost:8000` + `/session/me` → `http://localhost:8000/api/session/me`
- `http://localhost:8000/api` + `/session/me` → `http://localhost:8000/api/session/me`

### 修复双重 /api 前缀问题
**问题**: `apiFetch('/api/agents')` 会导致 `/api/api/agents`

**修复文件**:
- `src/domains/identity/api.ts`
- `src/domains/asset/api.ts`
- `src/domains/review/api.ts`
- `src/domains/task/api.ts`
- `src/domains/governance/api.ts`

### 修复路径不一致
**问题**: `session-state.ts` 使用 `/v1/session`，而其他地方使用 `/session/me`

**修复**:
- `/v1/session` → `/session/me`
- `/v1/login` → `/session/login`
- `/v1/logout` → `/session/logout`

### 修复 route-guard
**问题**: 使用 `/api/v1/bootstrap/status`

**修复**:
- `/api/v1/bootstrap/status` → `/api/bootstrap/status`（直接使用 fetch）

---

## SWR Cache Keys

SWR 使用 `/api/` 前缀作为缓存 key（仅用于缓存，不影响实际 API 调用）:
- `/api/agents`
- `/api/assets`
- `/api/tasks`
- `/api/session/me`
- etc.

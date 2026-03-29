# Agent Control Plane - 后端接口文档

## 项目概述

这是一个 **Agent Control Plane** 项目，用于协调人类、代理、密钥和轻量级任务的控制平面。后端基于 **FastAPI** 构建，提供 RESTful API 和 MCP (Model Context Protocol) 接口。

### 技术栈
- **框架**: FastAPI (Python)
- **数据库**: PostgreSQL (生产) / SQLite (开发)
- **缓存**: Redis
- **密钥后端**: OpenBao (生产) / 内存 (开发)
- **ORM**: SQLAlchemy
- **迁移**: Alembic

---

## 接口分类概览

后端接口按认证方式和用途分为以下几类：

| 分类 | 认证方式 | 说明 |
|------|----------|------|
| **公共接口** | 无需认证 | 健康检查、文档等 |
| **Bootstrap** | Bootstrap Key | 初始登录、系统启动 |
| **Agent Runtime** | Agent API Key (Bearer) | 代理运行时操作 |
| **Management** | Session Cookie | 管理控制台操作 |
| **Observability** | Session Cookie | 监控和可观测性 |
| **Knowledge** | 部分公开 | 知识库查询 |

---

## 一、公共接口 (Public)

### 1. 健康检查
```http
GET /healthz
```
- **描述**: 轻量级存活探针
- **认证**: 无需认证
- **响应**: `{"status": "ok"}`

### 2. API 文档
```http
GET /docs
GET /openapi.json
```
- **描述**: Swagger UI 和 OpenAPI 规范
- **认证**: 无需认证

---

## 二、Bootstrap 接口

### 1. 管理会话登录
```http
POST /api/session/login
```
- **描述**: 交换 Bootstrap 管理凭证获取短期管理会话 Cookie
- **认证**: Bootstrap Key
- **请求体**:
  ```json
  {
    "bootstrap_key": "string"
  }
  ```
- **响应**:
  ```json
  {
    "status": "authenticated",
    "actor_type": "human",
    "actor_id": "string",
    "role": "string",
    "auth_method": "bootstrap",
    "session_id": "string",
    "expires_in": 3600,
    "issued_at": 1234567890,
    "expires_at": 1234571490
  }
  ```

---

## 三、Agent Runtime 接口 (Bearer Token 认证)

### 1. 获取当前代理身份
```http
GET /api/agents/me
```
- **描述**: 验证 Agent API Key 并返回规范化身份
- **认证**: Bearer Token (Agent API Key)
- **标签**: Agent Runtime

### 2. 列出可用任务
```http
GET /api/tasks
```
- **描述**: 公开任务队列列表，供代理发现工作
- **认证**: 无需认证
- **标签**: Knowledge
- **响应**:
  ```json
  {
    "items": [...]
  }
  ```

### 3. 认领任务
```http
POST /api/tasks/{task_id}/claim
```
- **描述**: 代理认证后认领任务
- **认证**: Bearer Token
- **标签**: Agent Runtime

### 4. 完成任务
```http
POST /api/tasks/{task_id}/complete
```
- **描述**: 标记任务完成并持久化运行记录
- **认证**: Bearer Token
- **标签**: Agent Runtime
- **请求体**:
  ```json
  {
    "result_summary": "string",
    "output_payload": {}
  }
  ```

### 5. 调用能力
```http
POST /api/capabilities/{capability_id}/invoke
```
- **描述**: 通过代理模式调用能力，不暴露原始密钥
- **认证**: Bearer Token
- **标签**: Agent Runtime
- **请求体**:
  ```json
  {
    "task_id": "string",
    "parameters": {}
  }
  ```
- **错误码**:
  - `404`: 能力或任务不存在
  - `403`: 策略拒绝
  - `409`: 需要审批 (approval_required)
  - `502`: 网关执行错误

### 6. 请求能力租约
```http
POST /api/capabilities/{capability_id}/lease
```
- **描述**: 请求短期能力租约
- **认证**: Bearer Token
- **标签**: Agent Runtime
- **请求体**:
  ```json
  {
    "task_id": "string",
    "purpose": "string"
  }
  ```

### 7. MCP 端点
```http
POST /mcp
```
- **描述**: MCP 兼容的 JSON-RPC 端点，用于代理运行时和知识操作
- **认证**: Bearer Token
- **标签**: Agent Runtime
- **支持的方法**:
  - `initialize`: 初始化 MCP 会话
  - `tools/list`: 列出可用工具
  - `tools/call`: 调用工具

#### MCP 工具列表

| 工具名 | 描述 |
|--------|------|
| `list_tasks` | 列出可用任务 |
| `claim_task` | 认领任务 |
| `complete_task` | 完成任务 |
| `search_playbooks` | 搜索 Playbook |
| `invoke_capability` | 调用能力 |
| `request_capability_lease` | 请求能力租约 |

---

## 四、Management 接口 (Session Cookie 认证)

### 会话管理

#### 1. 获取当前会话
```http
GET /api/session/me
```
- **描述**: 返回会话 Cookie 携带的管理身份
- **认证**: Session Cookie
- **标签**: Management

#### 2. 登出
```http
POST /api/session/logout
```
- **描述**: 清除当前管理会话 Cookie
- **认证**: Session Cookie
- **标签**: Management

### 代理管理 (Admin+)

#### 3. 创建代理
```http
POST /api/agents
```
- **描述**: 创建新的代理身份并生成 API Key
- **认证**: Session Cookie (Admin+)
- **标签**: Management
- **请求体**:
  ```json
  {
    "name": "string",
    "allowed_capability_ids": [],
    "allowed_task_types": [],
    "risk_tier": "string"
  }
  ```

#### 4. 列出代理
```http
GET /api/agents
```
- **描述**: 列出已注册的代理
- **认证**: Session Cookie (Admin+)
- **标签**: Management

#### 5. 删除代理 (Owner)
```http
DELETE /api/agents/{agent_id}
```
- **描述**: 删除代理记录
- **认证**: Session Cookie (Owner)
- **标签**: Management

### 任务管理

#### 6. 创建任务
```http
POST /api/tasks
```
- **描述**: 创建新任务供代理认领执行
- **认证**: Session Cookie
- **标签**: Management
- **请求体**:
  ```json
  {
    "task_type": "string",
    "title": "string",
    "description": "string",
    "input_payload": {},
    "playbook_ids": []
  }
  ```

### 能力管理 (Admin+)

#### 7. 创建能力绑定
```http
POST /api/capabilities
```
- **描述**: 将存储的密钥绑定到能力合约
- **认证**: Session Cookie (Admin+)
- **标签**: Management
- **请求体**:
  ```json
  {
    "secret_id": "string",
    "adapter_type": "openai|github|generic_http",
    "adapter_config": {},
    "approval_mode": "auto|manual",
    "approval_rules": []
  }
  ```

#### 8. 列出能力
```http
GET /api/capabilities
```
- **描述**: 列出能力绑定
- **认证**: Session Cookie
- **标签**: Management

### 密钥管理 (Admin+)

#### 9. 创建密钥
```http
POST /api/secrets
```
- **描述**: 存储密钥到密钥后端
- **认证**: Session Cookie (Admin+)
- **标签**: Management
- **请求体**:
  ```json
  {
    "display_name": "string",
    "kind": "string",
    "value": "string",
    "provider": "string",
    "environment": "string",
    "provider_scopes": [],
    "resource_selector": {},
    "metadata": {}
  }
  ```

#### 10. 列出密钥
```http
GET /api/secrets
```
- **描述**: 返回脱敏的密钥清单
- **认证**: Session Cookie (Admin+)
- **标签**: Management

### Playbook 管理

#### 11. 创建 Playbook
```http
POST /api/playbooks
```
- **描述**: 创建可复用的 Playbook
- **认证**: Session Cookie
- **标签**: Management
- **请求体**:
  ```json
  {
    "task_type": "string",
    "title": "string",
    "body": "string",
    "tags": []
  }
  ```

#### 12. 搜索 Playbook
```http
GET /api/playbooks/search?task_type=xxx&q=xxx&tag=xxx
```
- **描述**: 搜索 Playbook
- **认证**: Session Cookie
- **标签**: Management
- **查询参数**:
  - `task_type`: 任务类型过滤
  - `q`: 文本搜索
  - `tag`: 标签过滤

#### 13. 获取 Playbook
```http
GET /api/playbooks/{playbook_id}
```
- **描述**: 获取单个 Playbook
- **认证**: Session Cookie
- **标签**: Management

### 审批管理 (Operator+)

#### 14. 列出审批请求
```http
GET /api/approvals?status=pending
```
- **描述**: 列出审批请求
- **认证**: Session Cookie (Operator+)
- **标签**: Management

#### 15. 批准请求
```http
POST /api/approvals/{approval_id}/approve
```
- **描述**: 批准待处理的审批请求
- **认证**: Session Cookie (Operator+)
- **标签**: Management
- **请求体**:
  ```json
  {
    "reason": "string"
  }
  ```

#### 16. 拒绝请求
```http
POST /api/approvals/{approval_id}/reject
```
- **描述**: 拒绝待处理的审批请求
- **认证**: Session Cookie (Operator+)
- **标签**: Management
- **请求体**:
  ```json
  {
    "reason": "string"
  }
  ```

### 资源目录

#### 17. 获取 Intake Catalog
```http
GET /api/intake-catalog
```
- **描述**: 返回管理表单所需的资源类型和字段元数据
- **认证**: Session Cookie
- **标签**: Management

---

## 五、Observability 接口

### 1. 列出运行记录
```http
GET /api/runs
```
- **描述**: 返回任务运行历史
- **认证**: Session Cookie
- **标签**: Observability

### 2. Prometheus 指标
```http
GET /metrics
```
- **描述**: Prometheus 兼容的监控指标
- **认证**: 无需认证（可配置）
- **标签**: Observability
- **指标包括**:
  - `agent_control_plane_up`: 进程状态
  - `agent_control_plane_uptime_seconds`: 运行时间
  - `agent_control_plane_http_requests_total`: HTTP 请求统计
  - `agent_control_plane_http_errors_total`: HTTP 错误统计
  - `agent_control_plane_management_session_logins_total`: 登录成功数
  - `agent_control_plane_management_session_login_failures_total`: 登录失败数
  - `agent_control_plane_task_claims_total`: 任务认领数
  - `agent_control_plane_task_completions_total`: 任务完成数
  - `agent_control_plane_approval_requests_total`: 审批请求数
  - `agent_control_plane_approval_approvals_total`: 审批通过数
  - `agent_control_plane_approval_rejections_total`: 审批拒绝数
  - `agent_control_plane_capability_invocations_total`: 能力调用成功数
  - `agent_control_plane_capability_invocation_failures_total`: 能力调用失败数

---

## 六、角色权限矩阵

| 角色 | 权限 |
|------|------|
| **任何管理会话** | `GET /api/session/me`, `POST /api/session/logout`, `GET /api/capabilities`, `POST /api/tasks`, `GET /api/runs`, `GET /api/playbooks/*`, `GET /api/intake-catalog` |
| **Operator+** | `GET /api/approvals`, `POST /api/approvals/{id}/approve`, `POST /api/approvals/{id}/reject` |
| **Admin+** | `POST /api/secrets`, `GET /api/secrets`, `POST /api/capabilities`, `GET /api/agents`, `POST /api/agents` |
| **Owner** | `DELETE /api/agents/{agent_id}` |

---

## 七、适配器类型

后端支持以下能力适配器：

| 适配器 | 用途 |
|--------|------|
| `openai` | OpenAI 兼容的聊天补全接口 |
| `github` | GitHub REST API 调用 |
| `generic_http` | 通用 JSON HTTP API |

---

## 八、数据模型概览

### 核心实体

| 实体 | 说明 |
|------|------|
| **Agent** | 代理身份，包含 API Key、允许的任务类型和能力列表 |
| **Task** | 任务，包含任务类型、输入/输出载荷、关联的 Playbook |
| **Capability** | 能力绑定，将密钥绑定到适配器配置 |
| **Secret** | 密钥存储，实际值存储在密钥后端 |
| **Playbook** | 可复用的执行指南 |
| **Run** | 任务执行记录 |
| **Approval Request** | 审批请求 |

---

## 九、API 端点汇总表

| 方法 | 路径 | 认证 | 标签 | 说明 |
|------|------|------|------|------|
| GET | `/healthz` | 无 | Bootstrap | 健康检查 |
| POST | `/api/session/login` | Bootstrap Key | Bootstrap | 登录 |
| POST | `/api/session/logout` | Cookie | Management | 登出 |
| GET | `/api/session/me` | Cookie | Management | 获取会话 |
| GET | `/api/agents/me` | Bearer | Agent Runtime | 当前代理身份 |
| GET | `/api/agents` | Cookie (Admin+) | Management | 列出代理 |
| POST | `/api/agents` | Cookie (Admin+) | Management | 创建代理 |
| DELETE | `/api/agents/{id}` | Cookie (Owner) | Management | 删除代理 |
| GET | `/api/tasks` | 无 | Knowledge | 列出任务 |
| POST | `/api/tasks` | Cookie | Management | 创建任务 |
| POST | `/api/tasks/{id}/claim` | Bearer | Agent Runtime | 认领任务 |
| POST | `/api/tasks/{id}/complete` | Bearer | Agent Runtime | 完成任务 |
| GET | `/api/capabilities` | Cookie | Management | 列出能力 |
| POST | `/api/capabilities` | Cookie (Admin+) | Management | 创建能力 |
| POST | `/api/capabilities/{id}/invoke` | Bearer | Agent Runtime | 调用能力 |
| POST | `/api/capabilities/{id}/lease` | Bearer | Agent Runtime | 请求租约 |
| GET | `/api/secrets` | Cookie (Admin+) | Management | 列出密钥 |
| POST | `/api/secrets` | Cookie (Admin+) | Management | 创建密钥 |
| GET | `/api/playbooks/search` | Cookie | Management | 搜索 Playbook |
| GET | `/api/playbooks/{id}` | Cookie | Management | 获取 Playbook |
| POST | `/api/playbooks` | Cookie | Management | 创建 Playbook |
| GET | `/api/approvals` | Cookie (Operator+) | Management | 列出审批 |
| POST | `/api/approvals/{id}/approve` | Cookie (Operator+) | Management | 批准请求 |
| POST | `/api/approvals/{id}/reject` | Cookie (Operator+) | Management | 拒绝请求 |
| GET | `/api/runs` | Cookie | Observability | 列出运行记录 |
| GET | `/api/intake-catalog` | Cookie | Management | 资源目录 |
| GET | `/metrics` | 无/可配置 | Observability | Prometheus 指标 |
| POST | `/mcp` | Bearer | Agent Runtime | MCP 端点 |

---

## 十、本地开发

### 启动 API 服务

```bash
# 使用内存密钥后端
.venv/bin/uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000

# 使用 OpenBao 密钥后端
SECRET_BACKEND=openbao OPENBAO_ADDR=http://127.0.0.1:8200 OPENBAO_TOKEN=root .venv/bin/uvicorn app.main:app --app-dir apps/api
```

### API 文档访问

- Swagger UI: http://127.0.0.1:8000/docs
- OpenAPI JSON: http://127.0.0.1:8000/openapi.json

---

*文档生成时间: 2026-03-29*
*API 版本: 0.1.0*

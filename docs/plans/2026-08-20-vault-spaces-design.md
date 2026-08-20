# Vault Spaces 设计文档

日期：2026-08-20
状态：已确认（追溯补写；功能于 2026-07-20 上线，迁移 `20260730_01_vault_spaces.py`）
范围：Spaces 的目标、数据模型、角色与授权语义、生命周期、迁移处理与不变量。

本文从已上线代码与测试反推而成，每条语义都标注证据来源。文档与代码冲突时，以代码与测试为准。

## 1. 目标与角色模型

在"单管理员 + N Agent"的基础上引入**共享凭据空间**：多个 agent 令牌可以加入同一个 Space，按角色协作读写该空间内的 Secret，而无需为每个令牌逐一配置 grant。

三种成员角色（`SpaceRole`，`app/orm/space_token_membership.py`）：

| 角色 | 读取 | 创建 Secret | 更新 Secret |
|---|---|---|---|
| `reader` | ✓ | ✗ | ✗ |
| `contributor` | ✓ | ✓ | 仅自己创建的（`created_by_agent_id` 匹配） |
| `maintainer` | ✓ | ✓ | 空间内任意 Secret |

权限派生的唯一实现位置：`app/modules/access/service.py`（`can_create`、`can_update_any`、`permissions_for`）。API 响应中 Secret 的 `permissions` 字段（`["read"]` 或 `["read", "update"]`）与 `access_source: "space"` 均由该服务派生。

## 2. 数据模型

### vault_spaces（`app/orm/vault_space.py`）

| 列/约束 | 说明 |
|---|---|
| `id` | UUID 主键 |
| `user_id` → users.id | 属主（单管理员模型下即管理员），CASCADE |
| `name` / `description` | `UNIQUE(user_id, name)` |
| `status` | `active` / `archived`，CHECK 约束 `check_vault_space_status` 兜底 |
| `created_at` / `updated_at` | 时区感知 |

### space_token_memberships（`app/orm/space_token_membership.py`）

| 列/约束 | 说明 |
|---|---|
| `id` | UUID 主键 |
| `user_id` → users.id | **租户属主冗余列**，用于按属主过滤（见 §6） |
| `space_id` → vault_spaces.id | CASCADE；空间 ORM 关系配置 `cascade="all, delete-orphan"` |
| `token_id` → agent_tokens.id | CASCADE；`UNIQUE(space_id, token_id)` |
| `role` | reader/contributor/maintainer，CHECK `check_space_membership_role` |
| `status` | `active` / `revoked`，CHECK `check_space_membership_status` |

### Secret 关联

Secret 通过 `space` 关系归属空间（`Secret.space` back_populates）；`created_by_agent_id` 记录创建者，支撑 contributor 的"仅更新自己创建的"语义。

## 3. API 与授权语义

### 管理端（`/api/admin/spaces`，`app/modules/spaces/routes.py`）

| 端点 | 说明 |
|---|---|
| `GET /api/admin/spaces` | 分页列表 |
| `POST /api/admin/spaces` | 创建 |
| `PATCH /api/admin/spaces/{id}` | 改名 / 归档（`status: archived`） |
| `DELETE /api/admin/spaces/{id}` | 删除；**存在成员时返回 409**，须先清空成员 |
| `GET /api/admin/spaces/{id}/memberships` | 成员列表 |
| `PUT /api/admin/spaces/{id}/memberships` | **整体替换**成员集；commit 处捕获 IntegrityError → 409 回滚 |

### Vault 端（agent 令牌）

| 端点 | 说明 |
|---|---|
| `GET /api/vault/spaces` | 列出该令牌可见的空间（含自身角色） |
| `POST /api/vault/spaces/{id}/secrets` | 在空间内创建 Secret，**强制 `Idempotency-Key`**（缺失 422；重放返回同一资源） |

Secret 的读取/更新复用既有 vault 端点，授权判定全部经 `access/service.py`（红线：禁止在路由内重复实现授权）。

## 4. 生命周期语义

- **成员吊销即时生效**：PUT memberships 将某成员置为 `status: revoked` 后，该令牌下一次请求即 403（测试 `test_maintainer_revocation_and_archiving_take_effect_immediately`）。
- **归档即拒绝**：空间 `status: archived` 后，包括 maintainer 在内所有成员访问空间内 Secret 均 403。
- **整体替换**：PUT memberships 是全量替换而非增量；并发替换的唯一约束冲突返回 409 且不残留部分状态（测试 `test_concurrent_membership_replace_conflict_returns_409`）。
- **删除保护**：有成员的空间不可删除（409），防止"删除空间→成员悬空"的孤儿状态。

## 5. 迁移与重名处理

- `20260730_01_vault_spaces.py`：建 `vault_spaces` 与 `space_token_memberships`，含全部 CHECK 约束与索引；纯新增表，不触碰既有数据。
- 前置的 `20260720_01_unique_secret_and_token_names.py`：为全局唯一索引做数据修复——重名记录按"保留最早行、其余追加 ` (n)` 后缀"规则改名（`_suffixed_name`，冲突时递增后缀），保证迁移在脏数据上也可完成。

## 6. 不变量清单（每条附守卫）

| 不变量 | 守卫 |
|---|---|
| 默认拒绝：非成员令牌看不到空间内任何 Secret（列表为空、详情 403） | `test_agents_collaborate_through_a_shared_space`（outsider 断言） |
| 租户属主过滤：成员载荷中出现其他属主的令牌 → 404（不泄漏存在性） | `test_space_membership_rejects_another_tenants_token` |
| 角色边界：reader 不可写（403）；contributor 只能更新自己创建的 | `test_agents_collaborate_through_a_shared_space`、access/service.py 单测 |
| 写操作幂等：vault 写缺 Idempotency-Key → 422；重放同 key 返回同一资源 | 同上（missing-key 与 replay 断言） |
| 并发一致性：整体替换冲突 → 409，无部分状态 | `test_concurrent_membership_replace_conflict_returns_409` |
| 枚举兜底：role/status/space status 均有 CHECK 约束 | ORM + 迁移 |
| 吊销/归档即时生效，无缓存窗口 | `test_maintainer_revocation_and_archiving_take_effect_immediately` |

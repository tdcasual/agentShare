# VaultGate Architecture Convergence Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 VaultGate 收敛为单管理员、多 Agent、多 Token、逐 Secret 授权的可靠凭据网关，并删除旧管理 API 与前端兼容层。

**Architecture:** 保留 FastAPI、PostgreSQL、Next.js 和现有 UI 基础，采用模块化单体与明确 service 事务边界。管理 API 统一为 `/api/admin/*`，浏览器 Session 与 `vgm_` 管理 Token 解析为统一管理员主体；`vg_` Agent Token 仅访问 `/api/vault/*`。

**Tech Stack:** Python 3.12、FastAPI、SQLAlchemy 2 async、Alembic、PostgreSQL/SQLite、pytest、Next.js 16、React 19、TypeScript、SWR、Vitest、Playwright。

---

## Execution Rules

- 每项行为变更必须先写测试并观察预期失败，再写生产代码。
- 每个任务先运行最窄测试，再运行对应后端或前端测试集。
- 不保留旧 `/api/secrets`、`/api/tokens`、`/api/session` 和旧响应兼容层。
- 数据库升级默认保留当前 User、Secret、Token、Scope 和 AuditLog 数据。
- 不自动提交；用户明确要求时再整理提交。

### Task 1: Restore Trustworthy Verification

**Files:**
- Modify: `apps/api/pyproject.toml`
- Regenerate: `apps/api/requirements.lock`
- Modify: `scripts/ops/bootstrap-dev-runtime.sh`
- Modify: `scripts/ops/verify-control-plane.sh`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/deploy.yml`
- Modify: `tests/ops/test_deploy_workflow.py`
- Modify: `tests/ops/test_container_artifacts.py`

**Steps:**
1. 写测试断言 API dev extra 包含当前 TestClient transport，并断言 deploy SCP 的每个本地源文件存在。
2. 运行 `python3 -m pytest tests/ops -q`，确认新测试因缺失依赖/不存在路径失败。
3. 声明并锁定测试 transport；统一 bootstrap/verify/CI 使用根 `.venv` 和一个权威测试命令。
4. 删除 deploy 上传列表中的不存在文件，统一为 `ops/compose/prod.env.example`。
5. 运行 ops 测试、clean venv API 收集、Ruff、mypy 和 85 个 API 测试。

### Task 2: Add Target Data Model and Migration

**Files:**
- Create: `apps/api/app/orm/admin_session.py`
- Create: `apps/api/app/orm/management_token.py`
- Create: `apps/api/app/orm/agent.py`
- Rename/replace: `apps/api/app/orm/token.py`
- Rename/replace: `apps/api/app/orm/scope.py`
- Modify: `apps/api/app/orm/audit_log.py`
- Modify: `apps/api/app/orm/user.py`
- Modify: `apps/api/app/orm/__init__.py`
- Create: `apps/api/alembic/versions/<revision>_agent_and_admin_auth.py`
- Test: `apps/api/tests/test_target_schema.py`
- Test: `apps/api/tests/test_migration_preserves_vaultgate_data.py`

**Steps:**
1. 写失败测试验证单管理员约束、Agent 多 Token、Grant 唯一约束、Session/ManagementToken 字段和审计快照。
2. 写迁移测试：先创建当前 schema 数据，再升级新 head，验证 Secret、Token 与 Scope 被保留并正确映射。
3. 实现最小 ORM 与 Alembic migration。
4. 运行 schema/migration 测试、Alembic upgrade 和 ORM 静态检查。

### Task 3: Unify Async Runtime and Transactions

**Files:**
- Modify: `apps/api/app/db.py`
- Modify: `apps/api/app/runtime.py`
- Modify: `apps/api/app/factory.py`
- Modify: `apps/api/app/dependencies.py`
- Test: `apps/api/tests/test_db.py`
- Test: `apps/api/tests/test_app_factory.py`

**Steps:**
1. 写失败测试验证应用只维护一个 async engine/session factory，并在 lifespan 正确释放。
2. 删除同步业务 engine/session factory；保留 Alembic 独立同步迁移路径。
3. 让 service 显式使用 `async_sessionmaker` 开启事务。
4. 运行 DB/factory 测试和后端测试集。

### Task 4: Implement Admin Sessions and Management Tokens

**Files:**
- Create: `apps/api/app/modules/admin_auth/service.py`
- Create: `apps/api/app/modules/admin_auth/routes.py`
- Create: `apps/api/app/modules/admin_auth/schemas.py`
- Modify: `apps/api/app/dependencies.py`
- Modify: `apps/api/app/rate_limit.py`
- Modify: `apps/api/app/config.py`
- Test: `apps/api/tests/test_admin_auth.py`
- Test: `apps/api/tests/test_management_tokens.py`

**Steps:**
1. 写失败测试覆盖 bootstrap、login、Session TTL、logout 服务端撤销和并发初始化。
2. 实现哈希 Session 存储与统一 `AdminPrincipal`。
3. 写失败测试覆盖多个 `vgm_` Token、TTL、轮换、撤销及与 `vg_` 的认证隔离。
4. 实现管理 Token 服务与路由。
5. 写失败测试覆盖可信代理后的 IP+email 限流，再实现最小限流存储接口。
6. 运行 admin auth 测试和安全中间件测试。

### Task 5: Implement Admin Secret API and Key Versioning

**Files:**
- Create: `apps/api/app/modules/secrets/service.py`
- Create: `apps/api/app/modules/secrets/routes.py`
- Create: `apps/api/app/modules/secrets/schemas.py`
- Modify: `apps/api/app/services/encryption.py`
- Test: `apps/api/tests/test_admin_secrets.py`
- Test: `apps/api/tests/test_encryption_keyring.py`

**Steps:**
1. 写失败测试验证 `/api/admin/secrets` CRUD、分页、稳定排序与所有权。
2. 写失败测试验证普通详情无明文、显式 value 响应 `no-store`。
3. 实现带版本的加密载荷和当前 keyring 解密接口。
4. 实现 Secret service 和 admin routes。
5. 运行 Secret、加密和迁移测试。

### Task 6: Implement Agents, Agent Tokens, and Grants

**Files:**
- Create: `apps/api/app/modules/agents/service.py`
- Create: `apps/api/app/modules/agents/routes.py`
- Create: `apps/api/app/modules/agents/schemas.py`
- Create: `apps/api/app/modules/tokens/service.py`
- Create: `apps/api/app/modules/tokens/routes.py`
- Create: `apps/api/app/modules/tokens/schemas.py`
- Test: `apps/api/tests/test_admin_agents.py`
- Test: `apps/api/tests/test_agent_tokens_and_grants.py`

**Steps:**
1. 写失败测试验证 Agent CRUD、停用语义和分页。
2. 实现 Agent service/routes。
3. 写失败测试验证一个 Agent 多 Token、一次性原文、TTL、轮换和单 Token 撤销。
4. 写失败测试验证 Grant 集合替换、逐 Secret 默认拒绝和幂等。
5. 实现 Token/Grant service/routes，并设置 Token 创建响应 `no-store`。
6. 运行 Agent/Token/Grant 测试。

### Task 7: Make Vault Access and Audit Fail Closed

**Files:**
- Create: `apps/api/app/modules/audit/service.py`
- Create: `apps/api/app/modules/audit/routes.py`
- Create: `apps/api/app/modules/vault/service.py`
- Create: `apps/api/app/modules/vault/routes.py`
- Test: `apps/api/tests/test_vault_authorization.py`
- Test: `apps/api/tests/test_audit_integrity.py`

**Steps:**
1. 写失败测试覆盖 Agent/Token 状态、TTL、Grant 和管理 Token/Agent Token 隔离。
2. 写失败测试证明 403 后 denied 审计持久化。
3. 写失败测试证明成功审计失败时不返回明文。
4. 实现独立审计事务、结构化快照和 Vault service。
5. 实现审计筛选、分页和聚合 stats。
6. 运行 Vault/Audit 测试和完整后端测试集。

### Task 8: Cut Over Routes and Delete Backend Compatibility

**Files:**
- Modify: `apps/api/app/routes/__init__.py`
- Delete: `apps/api/app/routes/auth.py`
- Delete: `apps/api/app/routes/bootstrap.py`
- Delete: `apps/api/app/routes/secrets_mgmt.py`
- Delete: `apps/api/app/routes/tokens.py`
- Delete: `apps/api/app/routes/runtime.py`
- Delete: `apps/api/app/routes/vault.py`
- Delete: `apps/api/app/routes/audit.py`
- Delete/replace: `apps/api/app/schemas/vault.py`
- Modify: backend tests and docs contract tests

**Steps:**
1. 写失败测试断言新 route 集完整且旧管理 route 全部 404。
2. 注册新模块 routes，删除旧 route 和 schemas。
3. 更新 OpenAPI route group 与错误响应。
4. 运行 100% 后端、ops 和 OpenAPI 契约测试。

### Task 9: Rebuild Frontend Contract and State

**Files:**
- Replace: `apps/control-plane-v3/src/lib/vaultgate-api.ts`
- Replace: `apps/control-plane-v3/src/lib/session.ts`
- Delete: `apps/control-plane-v3/src/lib/session-state.ts`
- Delete: `apps/control-plane-v3/src/lib/role-system.ts`
- Delete: `apps/control-plane-v3/src/store/role-store.ts`
- Delete/replace: `apps/control-plane-v3/src/shared/types/index.ts`
- Modify: `apps/control-plane-v3/src/components/route-guard.tsx`
- Modify: frontend unit/E2E fixtures

**Steps:**
1. 写失败测试验证 `setup_required | anonymous | authenticated | unavailable` 四态。
2. 用新 `/api/admin/*` 精确 DTO 重写 API client；所有请求同源 `/api`。
3. 删除旧 session/role/compatibility 状态。
4. 修复 bootstrap、login、logout 和 route guard。
5. 运行前端 unit、typecheck、lint 和入口 E2E。

### Task 10: Build Agent-Centric Admin UI

**Files:**
- Create: `apps/control-plane-v3/src/app/agents/page.tsx`
- Create: `apps/control-plane-v3/src/app/agents/[agentId]/page.tsx`
- Modify: `apps/control-plane-v3/src/app/secrets/page.tsx`
- Modify: `apps/control-plane-v3/src/app/audit/page.tsx`
- Modify: `apps/control-plane-v3/src/app/page.tsx`
- Delete: `apps/control-plane-v3/src/app/tokens/page.tsx`
- Modify: i18n messages and E2E specs

**Steps:**
1. 写失败测试覆盖 Agent 列表、详情、多 Token 和 Grant 编辑。
2. 实现 Agent 页面、Token 一次性展示、轮换、撤销与 Secret 多选授权。
3. 切换 Secret、Audit、Dashboard 到新契约和后端统计。
4. 删除顶级 Token 页面和旧导航。
5. 运行 unit、E2E、A11y 静态检查和生产 build。

### Task 11: Documentation, Deployment, and Recovery

**Files:**
- Modify: `README.md`
- Rewrite: `docs/guides/agent-quickstart.md`
- Modify: production deployment/security/operations guides
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Modify: `ops/compose/prod.env.example`
- Modify: smoke/backup/restore scripts and ops tests

**Steps:**
1. 写失败契约测试排除旧路径、旧 batch/fields 文档和旧 env 变量。
2. 更新文档、Compose 与 smoke contract。
3. 增加 migration preflight、备份与恢复验证说明。
4. 在 Docker runner 构建镜像、渲染 Compose、执行迁移和 synthetic flow。

### Task 12: Final Verification and Cleanup

**Files:**
- Update: `docs/audits/2026-07-14-release-audit.md`
- Update: `apps/control-plane-v3/AUDIT-REPORT.md`
- Update/delete: `.learnings/ERRORS.md` entries as resolved

**Steps:**
1. 搜索并删除旧管理 routes、role/session shim、legacy scope 字段和错误文档。
2. 运行 Ruff、mypy、Bandit、pytest、ops tests、frontend check/unit/coverage/E2E/build。
3. 运行 Python/npm/image 漏洞扫描和 Compose/staging 验收。
4. 更新审计问题状态并记录仍需外部环境完成的验证。

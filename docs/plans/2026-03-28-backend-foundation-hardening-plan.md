# Backend Foundation Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise the API backend from the current feature-complete baseline to a more production-grade runtime by removing global infrastructure state, formalizing schema migration, hardening production configuration, and replacing fragile identifier generation.

**Architecture:** Introduce an app-scoped runtime object that owns settings, engine, session factory, and reusable infrastructure handles. Route and service code must consume runtime-backed dependencies instead of module import side effects. Once runtime boundaries are explicit, land fail-fast production validation, establish Alembic as the schema authority, replace count-based business identifiers, and finish with standardized domain errors so routes stay thin and predictable.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Pydantic Settings, Alembic, pytest, GitHub Actions, Docker Compose.

---

## Execution Rules

- Do not implement this plan on `main`. Use `superpowers:using-git-worktrees` first and create an isolated branch such as `codex/backend-foundation-hardening`.
- Follow `superpowers:test-driven-development` for every behavior change: write the failing test first, run it to confirm the failure, then add the minimal implementation.
- Keep commits task-aligned. Do not combine runtime injection, migration setup, identifier changes, and error-contract cleanup into one commit.
- Treat the API as the primary scope. Only touch CI, deploy, or docs files when the backend contract now requires it.
- After each numbered task, run the listed verification command before moving on.

## Suggested Batch Boundaries

**Batch 1: Runtime boundaries**

- Task 1
- Task 2

**Batch 2: Production hardening**

- Task 3
- Task 4

**Batch 3: Domain cleanup**

- Task 5
- Task 6

## Preparation: Create isolated workspace and prove the current baseline

Run these commands before Task 1:

```bash
git -C /Users/lvxiaoer/Documents/codeWork/agentShare status -sb
git -C /Users/lvxiaoer/Documents/codeWork/agentShare worktree list
```

Create the worktree using `superpowers:using-git-worktrees`, then verify the current baseline inside the new worktree:

```bash
cd <new-worktree>
PYTHONPATH=apps/api pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected baseline:

- API tests pass
- ops tests pass
- web unit tests pass
- web build passes
- Playwright passes

If any baseline command fails, stop and document the pre-existing failure before changing code.

### Task 1: Scope database runtime and settings to the FastAPI app instance

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/runtime.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/db.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/conftest.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_app_factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_db.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runtime.py`

**Step 1: Write the failing test**

Add focused tests that prove:

- `create_app(Settings(...))` attaches a runtime object to `app.state`;
- the runtime carries the exact `database_url` passed into `create_app`;
- `get_db()` resolves its session factory from the request-scoped runtime instead of module-global `SessionLocal`.

Add a small test like this:

```python
def test_create_app_attaches_runtime_settings(tmp_path):
    db_path = tmp_path / "runtime.db"
    app = create_app(Settings(database_url=f"sqlite:///{db_path}"))

    runtime = app.state.runtime
    assert str(runtime.engine.url).endswith("runtime.db")
    assert runtime.settings.database_url.endswith("runtime.db")
```

Add a second test that calls the dependency through a request and confirms the yielded session is bound to `request.app.state.runtime`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_app_factory.py apps/api/tests/test_db.py apps/api/tests/test_runtime.py -q
```

Expected:

- the new runtime test fails because `app.state.runtime` does not exist;
- `get_db()` still resolves against module-global `SessionLocal`.

**Step 3: Write minimal implementation**

Implement:

- an `AppRuntime` dataclass in `apps/api/app/runtime.py` holding `settings`, `engine`, and `session_factory`;
- a runtime builder that creates the SQLAlchemy engine from the provided settings;
- `create_app()` storing that runtime in `app.state.runtime`;
- `get_db(request)` reading `request.app.state.runtime.session_factory` instead of importing a global sessionmaker;
- `init_db()` updated to accept runtime-owned engine/session resources rather than implicit module globals.

Keep the public route signatures unchanged in this task. Only move infrastructure ownership.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_app_factory.py apps/api/tests/test_db.py apps/api/tests/test_runtime.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/runtime.py apps/api/app/db.py apps/api/app/factory.py apps/api/tests/conftest.py apps/api/tests/test_app_factory.py apps/api/tests/test_db.py apps/api/tests/test_runtime.py
git commit -m "refactor(api): scope runtime resources to app instances"
```

### Task 2: Replace direct `Settings()` lookups with runtime-backed dependencies

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/dependencies.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/secret_backend.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/redis_client.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/conftest.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_session_auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secret_backend_openbao.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secret_backend_production.py`

**Step 1: Write the failing test**

Add tests that prove:

- the management login route uses a custom cookie name supplied through `create_app(Settings(management_session_cookie_name="ops_session", ...))`;
- `/metrics` honors `metrics_enabled=False` from the app runtime, not from process-global settings;
- `decode_management_session_token()` and `issue_management_session_token()` can be driven by explicit settings only;
- secret backend and Redis helpers resolve URLs and backend type from runtime-backed settings.

Add a route-level test like this:

```python
def test_management_login_uses_runtime_cookie_name(tmp_path):
    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'cookie.db'}",
        bootstrap_agent_key="bootstrap-test-token",
        management_session_secret="session-secret",
        management_session_cookie_name="ops_session",
    ))
    with TestClient(app) as client:
        response = client.post("/api/session/login", json={"bootstrap_key": "bootstrap-test-token"})
    assert "ops_session" in response.cookies
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_metrics.py apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py -q
```

Expected:

- cookie-name and metrics tests fail because `auth.py`, `routes/session.py`, and `routes/metrics.py` still call `Settings()` directly;
- secret backend and Redis helpers still depend on module-level settings.

**Step 3: Write minimal implementation**

Implement:

- `get_runtime()` and `get_settings()` dependencies in `apps/api/app/dependencies.py`;
- `require_management_session()` reading the cookie name from runtime-backed settings instead of module-level `APIKeyCookie(name=Settings()...)`;
- `routes/session.py` and `routes/metrics.py` depending on runtime-backed settings rather than instantiating `Settings()` inline;
- `session_service.py`, `secret_backend.py`, and `redis_client.py` taking explicit settings and/or runtime handles instead of defaulting to module-global state.

Prefer passing settings explicitly over importing `Settings()` in leaf functions.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_metrics.py apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/dependencies.py apps/api/app/auth.py apps/api/app/routes/session.py apps/api/app/routes/metrics.py apps/api/app/services/session_service.py apps/api/app/services/secret_backend.py apps/api/app/services/redis_client.py apps/api/tests/conftest.py apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_metrics.py apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py
git commit -m "refactor(api): inject runtime-backed settings and services"
```

### Task 3: Fail fast on insecure production configuration and visible degraded startup

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/config.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/redis_client.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_config.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_session_auth.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_startup_fail_fast.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_container_artifacts.py`

**Step 1: Write the failing test**

Add tests that assert:

- `Settings(app_env="production", bootstrap_agent_key="changeme-bootstrap-key", ...)` is rejected;
- `Settings(app_env="production", management_session_secret="changeme-management-session-secret", ...)` is rejected;
- `Settings(app_env="production", management_session_secure=False, ...)` is rejected;
- when idempotency or Redis-backed helpers cannot initialize, startup logs a clear warning in development but does not silently swallow the reason.

Add a focused config test like this:

```python
def test_production_settings_reject_default_management_secret():
    with pytest.raises(ValueError):
        Settings(
            app_env="production",
            secret_backend="openbao",
            openbao_addr="https://vault.example.com",
            openbao_token="token",
            bootstrap_agent_key="custom-bootstrap",
            management_session_secret="changeme-management-session-secret",
            management_session_secure=True,
        )
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_config.py apps/api/tests/test_session_auth.py apps/api/tests/test_startup_fail_fast.py tests/ops/test_container_artifacts.py -q
```

Expected:

- production settings tests fail because insecure defaults are still accepted;
- startup visibility tests fail because middleware degradation is still silent.

**Step 3: Write minimal implementation**

Implement:

- extra `Settings` validation forbidding default bootstrap/session secrets and insecure management cookies in staging/production;
- explicit startup warning or production exception when idempotency/Redis support cannot initialize;
- doc copy in `production-security.md` describing the new fail-fast expectations.

Do not add a full health-status matrix in this task. Keep it to validation and explicit startup visibility.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_config.py apps/api/tests/test_session_auth.py apps/api/tests/test_startup_fail_fast.py tests/ops/test_container_artifacts.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/config.py apps/api/app/factory.py apps/api/app/services/redis_client.py apps/api/tests/test_config.py apps/api/tests/test_session_auth.py apps/api/tests/test_startup_fail_fast.py docs/guides/production-security.md tests/ops/test_container_artifacts.py
git commit -m "harden(api): fail fast on insecure production configuration"
```

### Task 4: Establish Alembic as the schema authority and wire migrations into delivery

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic.ini`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/env.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/script.py.mako`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260328_01_baseline_schema.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/db.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_startup.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_alembic_migrations.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/ci.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/deploy.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_container_artifacts.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-deployment.md`

**Step 1: Write the failing test**

Add tests that assert:

- `cd apps/api && alembic upgrade head` creates the full schema on an empty sqlite database;
- startup no longer performs ad-hoc `ALTER TABLE` backfills for legacy columns;
- CI or deploy workflows explicitly run migrations before starting or validating the app;
- production deployment docs mention the migration step.

Add a migration test like this:

```python
def test_alembic_upgrade_creates_expected_tables(tmp_path, monkeypatch):
    db_path = tmp_path / "alembic.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    subprocess.run(["alembic", "upgrade", "head"], cwd=ROOT / "apps/api", check=True)
    engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    assert {"agents", "secrets", "capabilities", "tasks", "runs", "playbooks"}.issubset(set(inspector.get_table_names()))
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api && alembic upgrade head
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py tests/ops/test_container_artifacts.py -q
```

Expected:

- `alembic upgrade head` fails because the migration scaffold does not exist;
- ops/startup tests fail because deploy artifacts do not advertise migrations yet and startup still contains schema backfill logic.

**Step 3: Write minimal implementation**

Implement:

- a working Alembic environment rooted in `apps/api`;
- a baseline migration matching the current SQLAlchemy ORM schema;
- `db.py` cleanup that removes `_ensure_columns()` and other runtime schema mutation logic;
- CI and deploy workflow steps that run `alembic upgrade head` before API verification and before production restart;
- deployment docs that explain the migration step.

Keep the migration story simple: one baseline revision plus deterministic upgrade commands. Do not add autogenerate helpers or branching workflows in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api && alembic upgrade head
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py tests/ops/test_container_artifacts.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/alembic.ini apps/api/alembic/env.py apps/api/alembic/script.py.mako apps/api/alembic/versions/20260328_01_baseline_schema.py apps/api/app/db.py apps/api/tests/test_startup.py apps/api/tests/test_alembic_migrations.py .github/workflows/ci.yml .github/workflows/deploy.yml tests/ops/test_container_artifacts.py docs/guides/production-deployment.md
git commit -m "ops(api): add alembic migrations and deploy migration step"
```

### Task 5: Replace count-based business identifiers with stable prefixed IDs

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/identifiers.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/agents.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/task_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/capability_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/playbook_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/secret_backend.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/store.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_identifiers.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_tasks_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_capabilities_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_playbooks_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secrets_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_approvals_api.py`

**Step 1: Write the failing test**

Add tests that assert:

- resource creation no longer emits sequential IDs like `task-1`, `capability-1`, or `secret-1`;
- IDs preserve the existing resource prefix but use a stable unique suffix;
- deleting one record and creating another does not reuse the previous ID;
- helper functions do not need `len(repo.list_all())` to generate identifiers.

Add a helper test like this:

```python
def test_new_resource_id_uses_prefix_and_unique_suffix():
    first = new_resource_id("task")
    second = new_resource_id("task")
    assert first.startswith("task-")
    assert second.startswith("task-")
    assert first != second
    assert first != "task-1"
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_identifiers.py apps/api/tests/test_tasks_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_secrets_api.py apps/api/tests/test_approvals_api.py -q
```

Expected:

- helper test fails because no identifier service exists yet;
- API tests still expose count-based IDs.

**Step 3: Write minimal implementation**

Implement:

- a tiny identifier helper that returns prefixed UUID-based IDs such as `task-<uuid4hex>`;
- migration-safe adoption in task, capability, playbook, agent, and secret creation paths;
- cleanup of the legacy in-memory `store.py` counters so local test helpers do not reintroduce sequential IDs.

Do not change existing API field names. Only change how IDs are minted.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_identifiers.py apps/api/tests/test_tasks_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_secrets_api.py apps/api/tests/test_approvals_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/identifiers.py apps/api/app/routes/agents.py apps/api/app/services/task_service.py apps/api/app/services/capability_service.py apps/api/app/services/playbook_service.py apps/api/app/services/secret_backend.py apps/api/app/store.py apps/api/tests/test_identifiers.py apps/api/tests/test_tasks_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_secrets_api.py apps/api/tests/test_approvals_api.py
git commit -m "refactor(api): replace count-based resource identifiers"
```

### Task 6: Standardize domain errors and HTTP mapping for core management and runtime routes

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/errors.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/agents.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/capabilities.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/playbooks.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/tasks.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/capability_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/playbook_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/task_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_error_mapping.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_capabilities_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_playbooks_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_tasks_api.py`

**Step 1: Write the failing test**

Add tests that assert:

- missing resources return stable `404` payloads without leaking raw `KeyError` formatting;
- conflict states such as "task already claimed" map to `409`;
- permission failures map to `403`;
- services raise explicit domain exceptions rather than built-in `KeyError`, `ValueError`, or `PermissionError`.

Add an API-level test like this:

```python
def test_claiming_unknown_task_returns_clean_not_found(client):
    response = client.post("/api/tasks/task-missing/claim", headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Task not found"}
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_error_mapping.py apps/api/tests/test_tasks_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py -q
```

Expected:

- tests fail because built-in exceptions still leak route-specific formatting and inconsistent status mapping.

**Step 3: Write minimal implementation**

Implement:

- typed domain exceptions in `apps/api/app/errors.py`, for example `NotFoundError`, `ConflictError`, and `AuthorizationError`;
- one exception-to-HTTP mapping layer registered in `factory.py`;
- service-layer updates so core business flows raise typed domain errors;
- route cleanup that removes ad-hoc exception translation where the global handler now owns the contract.

Keep the scope to the management and runtime routes listed above. Do not convert every module in the repository in this pass.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests/test_error_mapping.py apps/api/tests/test_tasks_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/errors.py apps/api/app/factory.py apps/api/app/routes/agents.py apps/api/app/routes/capabilities.py apps/api/app/routes/playbooks.py apps/api/app/routes/tasks.py apps/api/app/services/capability_service.py apps/api/app/services/playbook_service.py apps/api/app/services/task_service.py apps/api/tests/test_error_mapping.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_tasks_api.py
git commit -m "refactor(api): standardize domain errors and route responses"
```

## Final Verification Before Merge

After Task 6, run the full project verification suite from the worktree:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected final result:

- API tests pass
- ops tests pass
- web unit tests pass
- web build passes
- Playwright passes

## Success Criteria

The plan is complete when all of the following are true:

- the FastAPI app owns its settings, engine, and session factory explicitly;
- routes and services no longer instantiate `Settings()` or module-global infrastructure as hidden dependencies;
- production configuration rejects insecure bootstrap/session defaults and degraded startup is visible;
- Alembic, not ad-hoc startup mutation, is the authoritative schema migration path;
- business IDs are stable and no longer derived from `len(list_all()) + 1` or global counters;
- core services raise typed domain errors with consistent HTTP translation;
- the full verification suite passes before merge.

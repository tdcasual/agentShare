# Backend 9.2 Hardening Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise the API backend from the current `8.6 / 10` baseline to roughly `9.2 / 10` by tightening request correctness, distributed coordination semantics, schema discipline, session revocation, and production observability without destabilizing the already-shipping control plane.

**Architecture:** Keep the current FastAPI, SQLAlchemy, and repository/service structure, but remove the remaining places where runtime behavior is looser than the public contract suggests. The main idea is to turn permissive fallback paths into explicit, testable behavior; make Alembic the only schema authority; add server-side control over management sessions; and upgrade observability from process-local convenience metrics to a more production-useful signal surface. Each task should remain independently shippable and must preserve current route shapes unless the change is intentionally tightening safety semantics.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Alembic, Redis, Pydantic Settings, pytest, GitHub Actions, Prometheus text metrics.

---

## Execution Rules

- Do not implement this plan on `main`. Start from a clean isolated worktree such as `codex/backend-9-2-hardening`.
- Follow `superpowers:test-driven-development` for each task: write the failing test first, run it to confirm the failure, then add the minimum implementation.
- Keep commits task-aligned. Do not combine idempotency, locking, migrations, session revocation, and observability in one commit.
- Treat current successful verification as the baseline, not as proof that the backend is already production-complete.
- Use the repo-local Python environment for verification:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
```

## Suggested Batch Boundaries

**Batch 1: Request correctness**

- Task 1
- Task 2
- Task 3

**Batch 2: Runtime and schema discipline**

- Task 4
- Task 5

**Batch 3: Security and operability**

- Task 6
- Task 7

## Current Baseline To Preserve

Run these commands before Task 1 inside the new worktree:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/<new-worktree>
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected baseline:

- API and ops tests pass
- web unit tests pass
- web build passes
- Playwright passes

If any baseline command fails, stop and document that failure before changing code.

### Task 1: Tighten idempotency fingerprints and replay fidelity

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/idempotency.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_idempotency.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_invoke_api.py`

**Step 1: Write the failing test**

Add tests that prove:

- the same `Idempotency-Key` cannot replay a cached response across different paths;
- the same `Idempotency-Key` cannot replay a cached response across different request bodies;
- cached responses preserve status code and only replay JSON responses explicitly supported by the middleware.

Add at least one focused middleware test like this:

```python
def test_idempotency_cache_key_includes_request_fingerprint():
    first = make_request("/api/one", {"value": 1}, headers={"Idempotency-Key": "same"})
    second = make_request("/api/two", {"value": 1}, headers={"Idempotency-Key": "same"})
    assert first.json() != second.json()
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_idempotency.py -q
```

Expected: FAIL because the middleware only keys on `Idempotency-Key` and does not fingerprint method, path, or body.

**Step 3: Write minimal implementation**

Implement:

- a request fingerprint composed from HTTP method, route path, and a stable JSON-or-bytes body hash;
- a cache envelope that records status code, media type, and a bounded JSON response payload;
- explicit bypass behavior for responses that the middleware cannot safely replay.

Do not try to make the middleware support every streaming response shape in this task. Prefer a narrow, explicit contract over a clever but fragile one.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_idempotency.py apps/api/tests/test_invoke_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/idempotency.py apps/api/tests/test_idempotency.py apps/api/tests/test_invoke_api.py
git commit -m "fix(api): harden idempotency request fingerprinting"
```

### Task 2: Make Redis-backed coordination fail closed in production

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/redis_client.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/leases.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/invoke.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_redis_lock.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_lease_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_invoke_api.py`

**Step 1: Write the failing test**

Add tests that prove:

- in development, Redis coordination failure is visible in logs but may still use a local fallback if the route explicitly allows it;
- in production-like settings, Redis coordination failure does not silently grant a lock;
- lease and invoke routes fail with a clear service error when coordination is unavailable in production mode.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_redis_lock.py apps/api/tests/test_lease_api.py apps/api/tests/test_invoke_api.py -q
```

Expected: FAIL because the current lock helper returns `True` when Redis is unavailable.

**Step 3: Write minimal implementation**

Implement:

- an explicit coordination error path in `redis_client.py`;
- production-like fail-closed behavior for lock acquisition;
- development-only local fallback that is deliberate and clearly logged;
- route-level error mapping for coordination unavailable scenarios.

Do not introduce a full distributed lock abstraction in this task. Fix the semantics first.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_redis_lock.py apps/api/tests/test_lease_api.py apps/api/tests/test_invoke_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/redis_client.py apps/api/app/routes/leases.py apps/api/app/routes/invoke.py apps/api/tests/test_redis_lock.py apps/api/tests/test_lease_api.py apps/api/tests/test_invoke_api.py
git commit -m "harden(api): fail closed on production coordination loss"
```

### Task 3: Remove implicit secret-backend fallback

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/secret_backend.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secret_backend_openbao.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secret_backend_production.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_config.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`

**Step 1: Write the failing test**

Add tests that prove:

- `SECRET_BACKEND=openbao` without credentials does not silently return an in-memory backend;
- development mode emits an explicit configuration error or explicit fallback warning;
- staging/production mode rejects the configuration outright.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py apps/api/tests/test_config.py -q
```

Expected: FAIL because the helper currently falls back to `InMemorySecretBackend` in some non-production cases.

**Step 3: Write minimal implementation**

Implement:

- explicit backend resolution rules that never pretend OpenBao is configured when it is not;
- either an explicit dev-only fallback mode flag or an explicit configuration error;
- doc updates that explain the new local and production expectations.

Keep the public secret create/read route shapes unchanged.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py apps/api/tests/test_config.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/secret_backend.py apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py apps/api/tests/test_config.py docs/guides/production-security.md
git commit -m "harden(api): remove implicit secret backend fallback"
```

### Task 4: Make Alembic the only schema authority

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/db.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_alembic_migrations.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_startup.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/ci.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/deploy.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-deployment.md`

**Step 1: Write the failing test**

Add tests that prove:

- startup does not create or mutate schema via `Base.metadata.create_all()` in production app boot;
- migrations remain the only supported path for schema creation;
- CI and deploy docs still require `alembic upgrade head`.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py tests/ops/test_container_artifacts.py -q
```

Expected: FAIL because app startup still initializes tables directly.

**Step 3: Write minimal implementation**

Implement:

- removal of runtime schema creation from the app lifespan;
- migration-driven startup expectations;
- doc and workflow alignment so delivery continues to run migrations before app verification or restart.

Do not introduce migration branching or advanced deploy orchestration in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py tests/ops/test_container_artifacts.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/db.py apps/api/app/factory.py apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py .github/workflows/ci.yml .github/workflows/deploy.yml docs/guides/production-deployment.md
git commit -m "ops(api): make alembic the only schema authority"
```

### Task 5: Remove remaining global runtime fallbacks

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/db.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/dependencies.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/redis_client.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/secret_backend.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runtime.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_db.py`

**Step 1: Write the failing test**

Add tests that prove:

- request-scoped dependencies do not build hidden fallback runtimes;
- scriptable helpers require explicit settings or runtime objects;
- importing `app.db` alone no longer creates a hidden default engine/session factory.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_runtime.py apps/api/tests/test_db.py -q
```

Expected: FAIL because `db.py` still exposes `_default_runtime` fallback behavior.

**Step 3: Write minimal implementation**

Implement:

- removal of `_default_runtime` and `__getattr__`-based engine/session fallback;
- explicit dependency boundaries around runtime-backed services;
- minimal test helper updates so fixtures construct the runtime intentionally.

Do not redesign every service factory in this task. Remove the hidden fallback first.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_runtime.py apps/api/tests/test_db.py apps/api/tests/test_app_factory.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/db.py apps/api/app/dependencies.py apps/api/app/services/redis_client.py apps/api/app/services/secret_backend.py apps/api/tests/test_runtime.py apps/api/tests/test_db.py
git commit -m "refactor(api): remove hidden runtime fallbacks"
```

### Task 6: Add revocable management sessions

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/management_session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/__init__.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/management_session_repo.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_01_management_sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_session_auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_auth.py`

**Step 1: Write the failing test**

Add tests that prove:

- login persists a session record keyed by `session_id`;
- logout revokes the persisted session, not just the browser cookie;
- a previously issued cookie is rejected after revocation;
- expired or revoked sessions fail even if their HMAC signature is still valid.

Add a focused test like this:

```python
def test_revoked_management_session_is_rejected(management_client):
    token = issue_token(...)
    revoke_session(...)
    assert decode_or_authenticate(token) raises session_revoked
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py -q
```

Expected: FAIL because current sessions are stateless HMAC cookies without server-side revocation.

**Step 3: Write minimal implementation**

Implement:

- a persisted management session record with `session_id`, `actor_id`, `issued_at`, `expires_at`, and `revoked_at`;
- login writing a session row before issuing the cookie;
- authentication checking both token integrity and session record status;
- logout marking the session revoked.

Do not build multi-user identity management in this task. Keep the current single configured operator model.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/orm/management_session.py apps/api/app/orm/__init__.py apps/api/app/repositories/management_session_repo.py apps/api/app/schemas/sessions.py apps/api/app/services/session_service.py apps/api/app/auth.py apps/api/app/routes/session.py apps/api/alembic/versions/20260329_01_management_sessions.py apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py
git commit -m "feat(api): add revocable management sessions"
```

### Task 7: Upgrade observability for production diagnostics

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/observability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_observability_logging.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`

**Step 1: Write the failing test**

Add tests that prove:

- request metrics expose at least method/path/status-aware counts or a stable labeled equivalent;
- request logging emits `request_id`, method, path, status, and duration in a consistent shape;
- metrics still expose the current approval/task/session counters after the refactor.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_metrics.py apps/api/tests/test_observability_logging.py -q
```

Expected: FAIL because metrics are still process-local aggregate counters without richer request dimensions.

**Step 3: Write minimal implementation**

Implement:

- a structured request event helper instead of ad hoc JSON assembly in middleware;
- richer metrics output for request totals and request errors by stable dimensions;
- doc updates that tell operators what to inspect first during incidents.

Keep the implementation lightweight. Do not introduce a full tracing stack in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_metrics.py apps/api/tests/test_observability_logging.py tests/ops/test_container_artifacts.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/observability.py apps/api/app/routes/metrics.py apps/api/app/factory.py apps/api/tests/test_metrics.py apps/api/tests/test_observability_logging.py docs/guides/production-operations.md
git commit -m "ops(api): deepen backend observability signals"
```

## Final Verification Before Merge

After Task 7, run the full backend verification suite from the worktree:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/<new-worktree>
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected final result:

- backend and ops tests pass
- web unit, build, and Playwright pass
- no route shape regresses unintentionally
- startup no longer hides degraded infrastructure states behind permissive fallbacks

## Success Criteria

The backend portion of the program is complete when all of the following are true:

- idempotent replay cannot cross request boundaries accidentally;
- production coordination does not silently degrade into permissive local success;
- OpenBao configuration errors are explicit instead of silently falling back to memory storage;
- Alembic is the only supported schema-authority path;
- no hidden module-global runtime fallback remains in the API dependency path;
- management sessions can be revoked server-side;
- request logging and metrics are rich enough to support first-response production debugging;
- the full repo verification suite still passes.

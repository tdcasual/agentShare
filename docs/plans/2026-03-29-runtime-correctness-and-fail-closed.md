# Runtime Correctness And Fail-Closed Behavior Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tighten the backend's remaining runtime-correctness gaps so retries, distributed coordination loss, and secret-backend misconfiguration behave explicitly and safely rather than permissively.

**Architecture:** Build on the now-stable Batch 1 composition work and the completed operator-trust/diagnostics phase. Keep the existing FastAPI, middleware, and service/repository structure, but remove the remaining places where the backend still "does something convenient" instead of something truthful. The focus here is request replay integrity, fail-closed runtime coordination in production-like environments, and explicit secret-backend resolution semantics.

**Tech Stack:** FastAPI, Starlette middleware, Redis, SQLAlchemy, pytest, Pydantic Settings, GitHub Actions, production docs.

---

## Scope

- Continue backend-first hardening before taking on broader UX work.
- Preserve current route shapes unless safety requires a more explicit failure response.
- Follow TDD for each behavior change.
- Keep every task independently shippable and commit-sized.

## Task 1: Tighten Idempotency Replay Fidelity

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/services/idempotency.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_idempotency.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_invoke_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/production-operations.md`

**Step 1: Write the failing tests**

Add tests that prove:

- the same `Idempotency-Key` does not replay cached responses across different paths;
- the same `Idempotency-Key` does not replay cached responses across different request bodies;
- only safely replayable JSON responses are cached and replayed;
- replay preserves the original status code.

Add at least one focused middleware test like:

```python
def test_same_idempotency_key_does_not_cross_route_boundaries(idempotent_app):
    first = idempotent_app.post("/one", headers={"Idempotency-Key": "same"}, json={"value": 1})
    second = idempotent_app.post("/two", headers={"Idempotency-Key": "same"}, json={"value": 1})
    assert first.json() != second.json()
```

**Step 2: Run the failing tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_idempotency.py apps/api/tests/test_invoke_api.py -q
```

Expected: FAIL because the middleware currently keys only on `Idempotency-Key` and caches any decoded body too loosely.

**Step 3: Implement the minimum safe replay contract**

Implement:

- a request fingerprint based on HTTP method, route path, and a stable body hash;
- a cache envelope that stores status code, media type, and replayable JSON payload only;
- explicit bypass behavior for unsupported response types instead of pretending replay is safe.

Do not broaden the middleware into a universal response recorder in this phase.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_idempotency.py apps/api/tests/test_invoke_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/idempotency.py apps/api/tests/test_idempotency.py apps/api/tests/test_invoke_api.py docs/guides/production-operations.md
git commit -m "fix(api): harden idempotency replay fidelity"
```

## Task 2: Make Redis Coordination Fail Closed In Production

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/errors.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/services/redis_client.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/services/task_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/services/gateway.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_redis_lock.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_tasks_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_invoke_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_lease_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/production-security.md`

**Step 1: Write the failing tests**

Add tests that prove:

- development mode may log and use a deliberate local fallback when Redis coordination is unavailable;
- production-like settings do not silently grant a lock when Redis is unavailable;
- task claim, invoke, and lease return a clear service-unavailable style error when coordination cannot be established in production-like mode.

Add at least one focused lock test like:

```python
def test_acquire_lock_fails_closed_in_production_when_redis_is_unavailable(monkeypatch):
    monkeypatch.setattr("app.services.redis_client.get_redis", failing_get_redis)
    assert acquire_lock("task:one", settings=Settings(app_env="production")) is False
```

**Step 2: Run the failing tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_redis_lock.py apps/api/tests/test_lease_api.py apps/api/tests/test_invoke_api.py -q
```

Expected: FAIL because coordination loss currently logs a warning and still returns success, and invoke/lease do not yet participate in distributed coordination.

**Step 3: Implement explicit coordination semantics**

Implement:

- an explicit coordination-error path in `redis_client.py`;
- fail-closed production/staging semantics for lock acquisition;
- coordination guards for the three active runtime entry points: task claim, capability invoke, and capability lease;
- a clear client-visible failure for coordination loss instead of an implicit 500;
- docs that explain the difference between local fallback and production behavior.

Do not add a brand-new locking subsystem in this phase. Keep the locking model narrow and action-scoped.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_redis_lock.py apps/api/tests/test_lease_api.py apps/api/tests/test_invoke_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/errors.py apps/api/app/services/redis_client.py apps/api/app/services/task_service.py apps/api/app/services/gateway.py apps/api/tests/test_redis_lock.py apps/api/tests/test_tasks_api.py apps/api/tests/test_lease_api.py apps/api/tests/test_invoke_api.py docs/guides/production-security.md
git commit -m "harden(api): fail closed on coordination loss"
```

## Task 3: Remove Implicit OpenBao Fallback

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/services/secret_backend.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_secret_backend_openbao.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_secret_backend_production.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_config.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/production-security.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/README.md`

**Step 1: Write the failing tests**

Add tests that prove:

- `SECRET_BACKEND=openbao` without credentials no longer silently returns the in-memory backend;
- development mode produces an explicit configuration failure or an explicitly named dev-only fallback mode;
- staging/production reject the configuration outright.

Add at least one focused test like:

```python
def test_get_secret_backend_rejects_openbao_without_credentials():
    with pytest.raises(ValueError, match="OpenBao"):
        get_secret_backend(Settings(secret_backend="openbao", openbao_addr=None, openbao_token=None))
```

**Step 2: Run the failing tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py apps/api/tests/test_config.py -q
```

Expected: FAIL because the helper still treats missing OpenBao credentials as a quiet path back to memory in some cases.

**Step 3: Implement explicit backend resolution**

Implement:

- strict backend selection rules that never imply OpenBao is active when it is not;
- either an explicit dev-only fallback flag or an explicit configuration error;
- docs that explain what local developers must set and what production must never allow.

Keep the secret create/read route contracts unchanged.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py apps/api/tests/test_config.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/secret_backend.py apps/api/tests/test_secret_backend_openbao.py apps/api/tests/test_secret_backend_production.py apps/api/tests/test_config.py docs/guides/production-security.md README.md
git commit -m "harden(api): remove implicit openbao fallback"
```

## Phase Verification

After all three tasks, run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected final result:

- idempotent retries are scoped to the actual request fingerprint rather than a bare client key;
- Redis coordination loss is visible and fail-closed in production-like environments;
- OpenBao misconfiguration no longer silently downgrades to in-memory secret handling;
- the existing API, ops, and web verification suites remain green.

## Done When

- Replayed writes cannot cross request boundaries just because the client reused an idempotency key.
- Production coordination semantics are honest: no Redis, no distributed lock.
- Secret-backend configuration tells the truth about which backend is active.
- The backend’s failure modes are more explicit than permissive.

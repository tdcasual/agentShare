# Operator Trust And Diagnostics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise the backend from a solid Batch 1 foundation to an operator-trustworthy control plane by making management sessions revocable server-side and upgrading observability from baseline counters to first-response diagnostics.

**Architecture:** Build this phase on top of the Batch 1 runtime cleanup rather than introducing parallel auth or logging stacks. Management sessions should keep the current signed-cookie shape, but authentication must also consult persisted session state so logout and revocation are real. Observability should stay lightweight and Prometheus-friendly, but request metrics and structured request logs must become specific enough that operators can diagnose failures without reading source code.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Playwright, Prometheus text metrics.

---

## Scope

- Complete the next highest-value backend work after Batch 1.
- Prioritize trust boundaries and diagnostics over new end-user features.
- Keep route shapes stable unless a tightening change is explicitly required for safety.
- Follow TDD for every behavior change.

## Task 1: Add Revocable Management Sessions

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/orm/management_session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/orm/__init__.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/repositories/management_session_repo.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/schemas/sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/routes/session.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/alembic/versions/20260329_01_management_sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_management_session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_session_auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_management_auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/web/tests/management-session.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/web/app/login/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/agent-quickstart.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/production-security.md`

**Step 1: Write the failing API tests**

Add tests that prove:

- login persists a management session row keyed by `session_id`;
- logout revokes the persisted row instead of only clearing the browser cookie;
- a validly signed but revoked cookie is rejected;
- an expired session row is rejected even if the cookie HMAC is still valid.

Add at least one focused service-level test like:

```python
def test_revoked_management_session_is_rejected(test_settings, db_session):
    payload = build_management_session_payload(test_settings)
    persist_management_session(db_session, payload)
    revoke_management_session(db_session, payload.session_id)

    token = issue_management_session_token(test_settings, payload)

    with pytest.raises(ManagementSessionError, match="revoked"):
        decode_management_session_token(token, test_settings, db_session)
```

**Step 2: Run the failing tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py -q
```

Expected: FAIL because the current implementation trusts signed cookie payloads without persisted session state.

**Step 3: Implement the minimum persistence layer**

Implement:

- a `ManagementSessionModel` with `session_id`, `actor_id`, `role`, `issued_at`, `expires_at`, and `revoked_at`;
- a repository for create, get-by-session-id, and revoke;
- an Alembic migration for the new table;
- login writing the session row before issuing the cookie;
- auth decoding the token and then checking persisted session state;
- logout revoking the stored row when present.

Keep the current single configured operator model. Do not build multi-operator administration in this phase.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py -q
cd apps/web && npx playwright test tests/management-session.spec.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/orm/management_session.py apps/api/app/orm/__init__.py apps/api/app/repositories/management_session_repo.py apps/api/app/schemas/sessions.py apps/api/app/services/session_service.py apps/api/app/auth.py apps/api/app/routes/session.py apps/api/alembic/versions/20260329_01_management_sessions.py apps/api/tests/test_management_session_service.py apps/api/tests/test_session_auth.py apps/api/tests/test_management_auth.py apps/web/tests/management-session.spec.ts apps/web/app/login/page.tsx docs/guides/agent-quickstart.md docs/guides/production-security.md
git commit -m "feat(api): add revocable management sessions"
```

## Task 2: Upgrade Observability For First-Response Diagnostics

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/observability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/app/routes/metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/apps/api/tests/test_observability_logging.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/tests/ops/test_container_artifacts.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/tests/ops/test_security_artifacts.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/.github/workflows/deploy.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/scripts/ops/smoke-test.sh`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master/docs/guides/production-security.md`

**Step 1: Write the failing tests**

Add tests that prove:

- request metrics expose stable method/path/status dimensions, or an equivalent labeled breakdown;
- request logs always include `request_id`, method, path, status, and duration;
- session/auth/task/approval counters still remain available after the richer request metrics land.

Add at least one focused metrics assertion like:

```python
def test_metrics_expose_request_dimensions(client):
    client.get("/healthz")
    payload = client.get("/metrics").text
    assert 'agent_control_plane_http_requests_total{method="GET",path="/healthz",status="200"}' in payload
```

**Step 2: Run the failing tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_metrics.py apps/api/tests/test_observability_logging.py tests/ops/test_container_artifacts.py tests/ops/test_security_artifacts.py -q
```

Expected: FAIL because current metrics only expose aggregate request totals and middleware still assembles logs ad hoc.

**Step 3: Implement the minimum richer signal model**

Implement:

- a small structured request event helper instead of inline JSON dict assembly in middleware;
- request metrics grouped by stable dimensions such as method/path/status;
- continued support for existing approval, task, capability, and session counters;
- doc and smoke-test updates that tell operators what to inspect during deploy verification and incidents.

Do not add distributed tracing or a new telemetry stack in this phase.

**Step 4: Run the tests again**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests/test_metrics.py apps/api/tests/test_observability_logging.py tests/ops/test_container_artifacts.py tests/ops/test_security_artifacts.py -q
docker compose config >/tmp/agentshare-compose-check.out
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/observability.py apps/api/app/factory.py apps/api/app/routes/metrics.py apps/api/tests/test_metrics.py apps/api/tests/test_observability_logging.py tests/ops/test_container_artifacts.py tests/ops/test_security_artifacts.py .github/workflows/deploy.yml scripts/ops/smoke-test.sh docs/guides/production-operations.md docs/guides/production-security.md
git commit -m "ops(api): deepen operator diagnostics"
```

## Phase Verification

After both tasks, run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/.worktrees/project-improvement-master
PYTHONPATH=apps/api /Users/lvxiaoer/Documents/codeWork/agentShare/.venv/bin/pytest apps/api/tests tests/ops -q
cd apps/web && npm run test:unit
cd apps/web && npm run build
cd apps/web && npx playwright test
```

Expected final result:

- management sessions are revocable server-side;
- request logs and metrics are useful for first-response diagnostics;
- backend and ops tests pass;
- web unit, build, and Playwright pass.

## Done When

- The backend no longer relies on stateless signed cookies as the only source of management-session truth.
- Operators can terminate a session and trust that the old cookie stops working.
- Request metrics and logs answer “what failed, where, and how often?” without source diving.
- The existing verification suite remains green after the trust and observability upgrades.

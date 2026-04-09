# Admin Bootstrap And Token-Targeted Tasks Implementation Plan

## Historical Status

This file is retained as historical planning context from an earlier token-centered stage of the product. It is **not** the current architecture source of truth.

Read these guides first for the current framing:

- `docs/guides/agent-server-first.md`
- `docs/guides/agent-quickstart.md`
- `docs/guides/admin-bootstrap-and-token-ops.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a durable human-admin model with one-time bootstrap registration, move agent authentication onto first-class managed tokens, let admins and agents create governed assets, and make task execution explicitly target and report on agent tokens rather than only agent identities.

**Architecture:** Keep the current FastAPI + SQLAlchemy + Alembic service shape, but split the domain into durable human accounts, agent identities, agent tokens, governed assets, token-targeted task assignments, and token feedback. The key design choice is to preserve the existing management-session and bearer-token entry points while changing what they resolve to underneath: human sessions should resolve to persisted admin accounts, and bearer auth should resolve to a specific token record plus its parent agent. Agent-created secrets, capabilities, playbooks, and tasks should enter a reviewable state instead of becoming active immediately.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Alembic, Pydantic, pytest, Next.js 15 (`apps/control-plane-v3`), TypeScript, existing audit + repository + service layers.

---

## Execution Rules

- Do not implement this plan directly on `main`. Start from an isolated worktree such as `codex/admin-bootstrap-token-targets`.
- Follow `superpowers:test-driven-development` for every task: write the failing test first, run it to confirm the failure, then add the minimum implementation.
- Preserve the current bootstrap key only for first-owner setup and emergency bootstrap checks during the migration window. Do not let it remain the normal daily login path after Task 2 lands.
- Keep agent-created secrets, capabilities, playbooks, and tasks non-active by default. They must enter a reviewable lifecycle state until an admin explicitly publishes or approves them.
- Prefer additive schema changes and compatibility shims before deleting old columns or routes.
- Use the repo-local verification commands shown below after each batch.

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests -q
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run typecheck
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3 && npm run build
```

## Suggested Batch Boundaries

**Batch 1: Bootstrap and admin identities**

- Task 1
- Task 2

**Batch 2: Agent token model and authorship**

- Task 3
- Task 4

**Batch 3: Token-targeted execution and feedback**

- Task 5
- Task 6

**Batch 4: Control plane UI and cleanup**

- Task 7
- Task 8

## Current Baseline To Preserve

Run these commands before Task 1 inside the new worktree:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests -q
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run build
```

Expected baseline:

- API tests pass.
- `control-plane-v3` typecheck passes.
- `control-plane-v3` production build passes.

If any baseline command fails, stop and document the failure before changing code.

### Task 1: Add durable admin accounts and one-time owner bootstrap

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/human_account.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/system_setting.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/human_account_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/system_setting_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/bootstrap.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/bootstrap_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/password_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/bootstrap.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_bootstrap_api.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_02_admin_bootstrap.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/__init__.py`

**Step 1: Write the failing test**

Add tests that prove:

- `GET /api/bootstrap/status` returns `initialized: false` when there is no owner account.
- `POST /api/bootstrap/setup-owner` creates the first owner only once.
- a second bootstrap attempt returns `409` and does not create a second owner.

Use focused expectations like:

```python
def test_setup_owner_only_works_once(client):
    first = client.post("/api/bootstrap/setup-owner", json=payload)
    second = client.post("/api/bootstrap/setup-owner", json=payload)
    assert first.status_code == 201
    assert second.status_code == 409
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_bootstrap_api.py -q
```

Expected: FAIL because the bootstrap routes, tables, and owner persistence do not exist yet.

**Step 3: Write minimal implementation**

Implement:

- a `human_accounts` table with `id`, `email`, `display_name`, `role`, `status`, `password_hash`, `last_login_at`;
- a `system_settings` table or equivalent keyed record that stores whether first-run bootstrap is complete;
- `bootstrap_service.py` helpers that:
  - check whether an active owner exists;
  - create the first owner;
  - mark the system initialized;
- `password_service.py` using a repository-local standard-library hash strategy such as `hashlib.scrypt` with explicit salt storage;
- `/api/bootstrap/status` and `/api/bootstrap/setup-owner`.

Use a schema shape like:

```python
class HumanAccountModel(Base, TimestampMixin):
    __tablename__ = "human_accounts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
```

Do not add public self-registration beyond the first-owner bootstrap in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_bootstrap_api.py apps/api/tests/test_startup.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/orm/human_account.py apps/api/app/orm/system_setting.py apps/api/app/repositories/human_account_repo.py apps/api/app/repositories/system_setting_repo.py apps/api/app/schemas/bootstrap.py apps/api/app/services/bootstrap_service.py apps/api/app/services/password_service.py apps/api/app/routes/bootstrap.py apps/api/tests/test_bootstrap_api.py apps/api/alembic/versions/20260329_02_admin_bootstrap.py apps/api/app/routes/__init__.py apps/api/app/factory.py apps/api/app/orm/__init__.py apps/api/app/repositories/__init__.py
git commit -m "feat: add one-time owner bootstrap"
```

### Task 2: Replace config-only management identity with persisted admin login and invite-only account creation

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/admin_accounts.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/admin_account_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/admin_accounts.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_admin_accounts_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/config.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_roles.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_session_service.py`

**Step 1: Write the failing test**

Add tests that prove:

- `/api/session/login` accepts `email + password` for persisted admin accounts.
- non-initialized systems reject normal login and instruct the operator to run bootstrap.
- owner/admin can create more admin accounts, but there is no public create-account route.
- existing role gates still work for `viewer`, `operator`, `admin`, `owner`.

Use a focused login assertion like:

```python
def test_management_login_uses_persisted_account_credentials(client, owner_account):
    response = client.post("/api/session/login", json={"email": owner_account.email, "password": "correct horse"})
    assert response.status_code == 200
    assert response.json()["role"] == "owner"
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_management_roles.py apps/api/tests/test_admin_accounts_api.py -q
```

Expected: FAIL because management login still depends on the bootstrap key and admin account management routes do not exist.

**Step 3: Write minimal implementation**

Implement:

- `ManagementIdentity` backed by `human_accounts` instead of `management_operator_id` settings;
- session payloads carrying `account_id`, `email`, and `role`;
- `/api/admin-accounts` management routes:
  - `POST` create invited admin/operator/viewer account;
  - `GET` list accounts;
  - `POST /{account_id}/disable` soft-disable;
- invite-only behavior:
  - after bootstrap, only owner/admin may create accounts;
  - there is no anonymous registration endpoint.

Keep `bootstrap_agent_key` only for Task 1 setup and emergency migration checks. Do not use it as the steady-state login credential anymore.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_management_session_service.py apps/api/tests/test_management_roles.py apps/api/tests/test_admin_accounts_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/schemas/admin_accounts.py apps/api/app/services/admin_account_service.py apps/api/app/routes/admin_accounts.py apps/api/tests/test_admin_accounts_api.py apps/api/app/config.py apps/api/app/auth.py apps/api/app/schemas/sessions.py apps/api/app/services/session_service.py apps/api/app/routes/session.py apps/api/app/routes/__init__.py apps/api/tests/test_management_roles.py apps/api/tests/test_management_session_service.py
git commit -m "feat: add persisted admin accounts and login"
```

### Task 3: Split agent identity from managed agent tokens

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/agent_token.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/agent_token_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/agent_tokens.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/agent_token_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/agent_tokens.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/models/runtime_principal.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_agent_tokens_api.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_03_agent_tokens.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/agent.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/models/agent.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/agents.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_agent_auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_api_key_auth.py`

**Step 1: Write the failing test**

Add tests that prove:

- one agent can hold multiple active tokens;
- bearer auth resolves both the parent agent and the concrete `token_id`;
- revoked tokens fail auth without deleting the parent agent;
- `/api/agents/{agent_id}/tokens` can mint and revoke tokens from the management console.

Use a runtime assertion like:

```python
def test_runtime_auth_returns_token_provenance(client, token):
    response = client.get("/api/agents/me", headers={"Authorization": f"Bearer {token.raw}"})
    assert response.status_code == 200
    assert response.json()["token_id"] == token.id
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_agent_auth.py apps/api/tests/test_api_key_auth.py apps/api/tests/test_agent_tokens_api.py -q
```

Expected: FAIL because `agents.api_key_hash` still models only one credential and runtime auth cannot identify a token record.

**Step 3: Write minimal implementation**

Implement:

- `agent_tokens` table with fields:
  - `id`
  - `agent_id`
  - `display_name`
  - `token_hash`
  - `token_prefix`
  - `status`
  - `expires_at`
  - `issued_by_actor_type`
  - `issued_by_actor_id`
  - `last_used_at`
  - `scopes`
  - `labels`
- runtime principal model that includes:
  - `agent_id`
  - `agent_name`
  - `token_id`
  - `risk_tier`
  - allowlists/scopes
- management routes for token lifecycle:
  - `POST /api/agents/{agent_id}/tokens`
  - `GET /api/agents/{agent_id}/tokens`
  - `POST /api/agent-tokens/{token_id}/revoke`

Keep the bootstrap agent as a compatibility carve-out if needed, but move all non-bootstrap runtime auth onto `agent_tokens`.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_agent_auth.py apps/api/tests/test_api_key_auth.py apps/api/tests/test_agent_tokens_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/orm/agent_token.py apps/api/app/repositories/agent_token_repo.py apps/api/app/schemas/agent_tokens.py apps/api/app/services/agent_token_service.py apps/api/app/routes/agent_tokens.py apps/api/app/models/runtime_principal.py apps/api/tests/test_agent_tokens_api.py apps/api/alembic/versions/20260329_03_agent_tokens.py apps/api/app/orm/agent.py apps/api/app/models/agent.py apps/api/app/auth.py apps/api/app/routes/agents.py apps/api/app/routes/__init__.py apps/api/tests/test_agent_auth.py apps/api/tests/test_api_key_auth.py
git commit -m "feat: split agent tokens from agent identities"
```

### Task 4: Add actor provenance and review state to secrets, capabilities, playbooks, and tasks

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/review_queue.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/review_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/reviews.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_review_queue_api.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_04_asset_provenance_and_review.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/secret.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/capability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/playbook.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/task.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/secrets.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/capabilities.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/playbooks.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/tasks.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/audit_service.py`

**Step 1: Write the failing test**

Add tests that prove:

- admin-created assets land directly in `active`;
- token-created assets land in `pending_review`;
- review endpoints can approve or reject token-created assets;
- audit events include both actor identity and `via_token_id`.

Use a focused lifecycle assertion like:

```python
def test_agent_created_playbook_starts_pending_review(runtime_client, admin_client):
    created = runtime_client.post("/api/playbooks", json=payload)
    assert created.status_code == 202
    assert created.json()["publication_status"] == "pending_review"
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_secrets_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_tasks_api.py apps/api/tests/test_review_queue_api.py -q
```

Expected: FAIL because resources currently have no actor provenance or review lifecycle.

**Step 3: Write minimal implementation**

Add these fields to governed assets:

```python
created_by_actor_type: Mapped[str] = mapped_column(String, nullable=False)
created_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)
created_via_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
publication_status: Mapped[str] = mapped_column(String, default="active")
reviewed_by_actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

Implement route behavior:

- management session creates `active` records immediately;
- runtime token create routes create `pending_review` records;
- secrets from runtime stay non-runnable until approved;
- review queue routes expose approve/reject with audit logging.

Do not attempt a generic moderation engine in this task. Use one shared lifecycle vocabulary across the four resource types.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_secrets_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_tasks_api.py apps/api/tests/test_review_queue_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/schemas/review_queue.py apps/api/app/services/review_service.py apps/api/app/routes/reviews.py apps/api/tests/test_review_queue_api.py apps/api/alembic/versions/20260329_04_asset_provenance_and_review.py apps/api/app/orm/secret.py apps/api/app/orm/capability.py apps/api/app/orm/playbook.py apps/api/app/orm/task.py apps/api/app/routes/secrets.py apps/api/app/routes/capabilities.py apps/api/app/routes/playbooks.py apps/api/app/routes/tasks.py apps/api/app/routes/__init__.py apps/api/app/services/audit_service.py
git commit -m "feat: add provenance and review state to governed assets"
```

### Task 5: Retarget tasks to tokens and record token-specific execution

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/task_target.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/task_target_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/task_targets.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_task_targets_api.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_05_task_targets_and_run_provenance.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/task.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/run.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/tasks.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/tasks.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/task_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/runs.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_tasks_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runs_api.py`

**Step 1: Write the failing test**

Add tests that prove:

- a task can target one or more token ids;
- runtime task listing returns only task targets assigned to the authenticated token;
- claim/complete operations happen against a task target record;
- runs persist `agent_id`, `token_id`, and `task_target_id`.

Use a focused assertion like:

```python
def test_assigned_queue_only_returns_tasks_for_current_token(runtime_client_a, runtime_client_b):
    assert {item["target_token_id"] for item in runtime_client_a.get("/api/tasks/assigned").json()["items"]} == {"token-a"}
    assert {item["target_token_id"] for item in runtime_client_b.get("/api/tasks/assigned").json()["items"]} == {"token-b"}
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_tasks_api.py apps/api/tests/test_runs_api.py apps/api/tests/test_task_targets_api.py -q
```

Expected: FAIL because tasks are currently global queue items with only `claimed_by` and runs only persist `agent_id`.

**Step 3: Write minimal implementation**

Implement:

- `task_targets` table with:
  - `id`
  - `task_id`
  - `target_token_id`
  - `status`
  - `claimed_by_token_id`
  - `claimed_by_agent_id`
  - `claimed_at`
  - `completed_at`
  - `last_run_id`
- task create payload extension:
  - `target_token_ids: list[str]`
  - optionally `target_mode: "explicit_tokens" | "broadcast"`
- runtime routes:
  - `GET /api/tasks/assigned`
  - `POST /api/task-targets/{target_id}/claim`
  - `POST /api/task-targets/{target_id}/complete`
- run persistence:
  - add `token_id`
  - add `task_target_id`
  - preserve `agent_id` for rollups

Do not keep public unauthenticated task discovery for token-targeted tasks. Once this task lands, runtime queue access should be authenticated and token-filtered.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_tasks_api.py apps/api/tests/test_runs_api.py apps/api/tests/test_task_targets_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/orm/task_target.py apps/api/app/repositories/task_target_repo.py apps/api/app/schemas/task_targets.py apps/api/tests/test_task_targets_api.py apps/api/alembic/versions/20260329_05_task_targets_and_run_provenance.py apps/api/app/orm/task.py apps/api/app/orm/run.py apps/api/app/schemas/tasks.py apps/api/app/routes/tasks.py apps/api/app/services/task_service.py apps/api/app/routes/runs.py apps/api/tests/test_tasks_api.py apps/api/tests/test_runs_api.py
git commit -m "feat: target tasks to tokens and persist run provenance"
```

### Task 6: Add token feedback, trust aggregates, and review-aware completion signals

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/token_feedback.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/token_feedback_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/token_feedback.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/token_feedback_service.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/token_feedback.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_token_feedback_api.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_06_token_feedback.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/agent_token.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/runs.py`

**Step 1: Write the failing test**

Add tests that prove:

- owner/admin can attach feedback to a completed token-target result;
- feedback is linked to `token_id`, `task_target_id`, and `run_id`;
- agent token detail surfaces aggregate trust fields like `success_rate` and `last_feedback_at`.

Use a focused assertion like:

```python
def test_feedback_rolls_up_to_token_metrics(admin_client, completed_target):
    admin_client.post(f"/api/task-targets/{completed_target.id}/feedback", json={"score": 5, "verdict": "accepted"})
    token = admin_client.get(f"/api/agents/{completed_target.agent_id}/tokens").json()["items"][0]
    assert token["success_rate"] == 1.0
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_token_feedback_api.py apps/api/tests/test_runs_api.py -q
```

Expected: FAIL because there is no feedback table, route, or token aggregate model.

**Step 3: Write minimal implementation**

Implement:

- `token_feedback` table with `token_id`, `task_target_id`, `run_id`, `source`, `score`, `verdict`, `summary`, `created_by_actor_type`, `created_by_actor_id`;
- aggregate fields on `agent_tokens`:
  - `completed_runs`
  - `successful_runs`
  - `success_rate`
  - `last_feedback_at`
  - `trust_score`
- feedback route:
  - `POST /api/task-targets/{target_id}/feedback`
  - optional `GET /api/agent-tokens/{token_id}/feedback`

Compute aggregates server-side whenever feedback is created. Do not introduce background jobs in this task.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_token_feedback_api.py apps/api/tests/test_runs_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/orm/token_feedback.py apps/api/app/repositories/token_feedback_repo.py apps/api/app/schemas/token_feedback.py apps/api/app/services/token_feedback_service.py apps/api/app/routes/token_feedback.py apps/api/tests/test_token_feedback_api.py apps/api/alembic/versions/20260329_06_token_feedback.py apps/api/app/orm/agent_token.py apps/api/app/routes/__init__.py apps/api/app/routes/runs.py
git commit -m "feat: add token feedback and trust aggregates"
```

### Task 7: Update the control plane UI for bootstrap, admin accounts, tokens, reviews, and token-targeted tasks

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/setup/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/login/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/tokens/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/reviews/page.tsx`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/api.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/lib/session.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/settings/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/shared/types/index.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/page.tsx`

**Step 1: Write the failing test**

Because the current frontend has no route-level test harness yet, add narrow component or utility tests only if the team first introduces one. If not, write the red state as a manual verification checklist in the plan branch and enforce it through typecheck + build:

- unauthenticated app shows bootstrap page when not initialized;
- initialized app shows login page until a session exists;
- admin can see token list and token status;
- admin can review pending secret/capability/playbook/task submissions;
- tasks page shows target-token assignments and feedback summaries.

**Step 2: Run verification to capture the red baseline**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npm run typecheck
npm run build
```

Expected: Either PASS on the untouched demo UI or FAIL once the new routes/types are referenced but not implemented.

**Step 3: Write minimal implementation**

Implement:

- setup screen backed by `/api/bootstrap/status` and `/api/bootstrap/setup-owner`;
- login screen backed by `/api/session/login`;
- tokens page with token status, prefix, last used, expiry, trust score;
- reviews page for pending agent-created assets;
- tasks page with:
  - target token chips,
  - completion status by token,
  - feedback summary;
- sidebar entries for `Tokens` and `Reviews`.

Do not redesign the entire app shell in this task. Reuse the current `control-plane-v3` layout and only add the new management surfaces.

**Step 4: Run verification to confirm green**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npm run typecheck
npm run build
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/app/setup/page.tsx apps/control-plane-v3/src/app/login/page.tsx apps/control-plane-v3/src/app/tokens/page.tsx apps/control-plane-v3/src/app/reviews/page.tsx apps/control-plane-v3/src/lib/api.ts apps/control-plane-v3/src/lib/session.ts apps/control-plane-v3/src/interfaces/human/layout/sidebar.tsx apps/control-plane-v3/src/app/tasks/page.tsx apps/control-plane-v3/src/app/settings/page.tsx apps/control-plane-v3/src/shared/types/index.ts apps/control-plane-v3/src/app/page.tsx
git commit -m "feat: add admin bootstrap token and review ui"
```

### Task 8: Remove compatibility gaps, document migration behavior, and verify end-to-end flows

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/admin-bootstrap-and-token-ops.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_openapi_contract.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_app_factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runtime.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_startup.py`

**Step 1: Write the failing test**

Add final integration tests that prove:

- fresh system startup exposes bootstrap status and no normal management login;
- after owner bootstrap, admin login works and public registration stays closed;
- admin can mint a token for an agent;
- that token can see only its assigned tasks;
- completing a task stores a token-linked run;
- admin feedback updates token aggregates.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_app_factory.py apps/api/tests/test_runtime.py apps/api/tests/test_startup.py apps/api/tests/test_openapi_contract.py -q
```

Expected: FAIL until all new startup, routing, and contract behavior is wired end-to-end.

**Step 3: Write minimal implementation**

Implement:

- startup checks that ensure bootstrap state is readable before management login;
- README and operator runbook updates covering:
  - first owner setup;
  - admin account creation;
  - agent token lifecycle;
  - review queue semantics;
  - token-targeted task and feedback flow;
- OpenAPI assertions for the new bootstrap, admin account, token, task-target, and feedback routes.

At the end of this task, remove or clearly deprecate any compatibility path that still suggests the bootstrap key is the normal admin login mechanism.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests -q
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run build
```

Expected: PASS

**Step 5: Commit**

```bash
git add docs/guides/admin-bootstrap-and-token-ops.md README.md apps/api/tests/test_openapi_contract.py apps/api/tests/test_app_factory.py apps/api/tests/test_runtime.py apps/api/tests/test_startup.py
git commit -m "docs: finalize admin bootstrap and token-target workflow"
```

## Domain Notes To Preserve During Implementation

- A human admin account is not an agent and must never authenticate with an agent bearer token.
- An agent token is not the same as an external provider key stored in `secrets`.
- Admins manage agent tokens. Agents may create governed assets, but those assets must remain reviewable until an admin approves them.
- Tasks target tokens, not generic agents. A parent agent may own many tokens with different scopes or environments.
- Completion should retain both dimensions:
  - `agent_id` for identity-level reporting.
  - `token_id` for execution provenance and feedback.
- Feedback belongs to the token-targeted execution result, not only to the task definition.

## Open Questions To Resolve During Execution

- Whether token scopes should be separate from parent-agent allowlists or treated as an extra narrowing layer. Recommendation: narrowing layer only.
- Whether admin login should support password reset in the same batch. Recommendation: no, defer until the bootstrap + invite flow is stable.
- Whether agent-created tasks should become `pending_review` or `draft`. Recommendation: `pending_review` so they are visible in the review queue immediately.
- Whether task targeting should support dynamic cohorts in the first release. Recommendation: no, explicit token ids first.

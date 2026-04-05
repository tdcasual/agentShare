# API Compatibility Removal And Baseline Reset Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove backend compatibility code and historical migration baggage from `apps/api`, assuming there is no existing production data to preserve.

**Architecture:** Keep the current product behavior that already passed audit and regression, but collapse the codebase to one canonical schema and one canonical runtime contract. Remove legacy parsing and token compatibility branches, replace the Alembic history with a single clean baseline migration, and trim tests that only exist to validate upgrade-from-legacy behavior.

**Tech Stack:** FastAPI, SQLAlchemy ORM, Alembic, Pydantic v2, pytest, Ruff

---

### Task 1: Freeze The Canonical Backend Contract

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/secrets.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/capabilities.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/scope_policy.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_openapi_contract.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_session_auth.py`

**Step 1: Write the failing contract tests**

Add focused assertions that the backend no longer accepts or documents legacy shapes:

```python
def test_secret_create_rejects_legacy_scope_shape(management_client):
    response = management_client.post(
        "/api/secrets",
        json={
            "display_name": "Legacy secret",
            "kind": "api_token",
            "value": "sk-test",
            "scope": {"provider": "openai"},
        },
    )
    assert response.status_code == 422
```

```python
def test_openapi_management_cookie_name_matches_runtime_settings(tmp_path):
    app = create_app(Settings(database_url=f"sqlite:///{tmp_path / 'contract.db'}"))
    schema = app.openapi()
    assert schema["components"]["securitySchemes"]["ManagementSession"]["name"] == "management_session"
```

**Step 2: Run the focused tests to capture the red baseline**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_openapi_contract.py apps/api/tests/test_session_auth.py apps/api/tests/test_secrets_api.py -q
```

Expected: one or more failures showing legacy `scope` input is still accepted or transformed.

**Step 3: Write the minimal implementation**

Make these behavior-preserving removals:
- delete `SecretCreate.upgrade_legacy_scope()`
- stop reading `_legacy_scope()` fallback data inside `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/scope_policy.py`
- remove `build_legacy_runtime_token_id()` usage from `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- keep only the canonical fields now used by runtime and management tests

Representative target state:

```python
secret_provider = _read(secret, "provider")
secret_environment = _read(secret, "environment")
secret_scopes = set(_as_list(_read(secret, "provider_scopes")))
```

**Step 4: Re-run the focused tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_openapi_contract.py apps/api/tests/test_session_auth.py apps/api/tests/test_secrets_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/app/auth.py apps/api/app/schemas/secrets.py apps/api/app/schemas/capabilities.py apps/api/app/services/scope_policy.py apps/api/tests/test_openapi_contract.py apps/api/tests/test_session_auth.py apps/api/tests/test_secrets_api.py
git commit -m "refactor(api): remove legacy contract branches"
```

### Task 2: Remove Legacy Token Compatibility From Runtime Auth

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/agent_token_service.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_agent_auth.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_api_key_auth.py`

**Step 1: Write the failing tests**

Add a focused assertion that only real `agent_tokens` or the bootstrap exception remain:

```python
def test_legacy_agent_api_key_hash_path_is_not_used_for_runtime_agents(db_session):
    ...
    assert resolve_agent_from_api_key("legacy-key", db_session) is None
```

**Step 2: Run the focused tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_agent_auth.py apps/api/tests/test_api_key_auth.py -q
```

Expected: FAIL because the legacy API-key-hash fallback path still authenticates old-style agents.

**Step 3: Write the minimal implementation**

Simplify `resolve_agent_from_api_key()` to:
- accept bootstrap via configured bootstrap hash path only if explicitly needed
- accept runtime agents only through `agent_tokens`
- remove `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/agent_token_service.py:build_legacy_runtime_token_id`

Representative target:

```python
if token_model is None:
    return None
```

Keep bootstrap behavior isolated and explicit rather than mixed into runtime token compatibility.

**Step 4: Re-run the focused tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_agent_auth.py apps/api/tests/test_api_key_auth.py apps/api/tests/test_management_auth.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/app/auth.py apps/api/app/services/agent_token_service.py apps/api/tests/test_agent_auth.py apps/api/tests/test_api_key_auth.py apps/api/tests/test_management_auth.py
git commit -m "refactor(api): remove legacy runtime token auth"
```

### Task 3: Replace Alembic History With One Clean Baseline

**Files:**
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260328_01_baseline_schema.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_01_management_sessions.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_02_admin_bootstrap.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_03_agent_tokens.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_04_asset_provenance_and_review.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_05_task_targets_and_run_provenance.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260329_06_token_feedback.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260330_01_capability_access_policy.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260330_02_selector_based_capability_access_policy.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260331_01_events_and_search.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_01_catalog_release_v1.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_03_spaces_domain_v1.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_04_catalog_release_hardening.py`
- Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260404_01_pending_secret_review_hardening.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260405_01_clean_baseline.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_alembic_migrations.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_startup.py`

**Step 1: Write the new baseline-only tests**

Replace legacy-upgrade expectations with baseline assertions:

```python
def test_alembic_upgrade_head_creates_current_schema(tmp_path):
    ...
    assert "pending_secret_materials" in inspector.get_table_names()
```

```python
def test_startup_runs_current_baseline_only(monkeypatch, tmp_path):
    ...
    assert migrated_revision == "20260405_01"
```

**Step 2: Run the migration tests to capture the red baseline**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py -q
```

Expected: FAIL because tests and revision chain still assume historical upgrades.

**Step 3: Write the minimal implementation**

Create a single Alembic revision that defines the current schema directly and make it the only head.

Required baseline tables should include at least:
- `agents`
- `agent_tokens`
- `human_accounts`
- `management_sessions`
- `system_settings`
- `secrets`
- `pending_secret_materials`
- `capabilities`
- `tasks`
- `task_targets`
- `runs`
- `playbooks`
- `audit_events`
- `approval_requests`
- `events`
- `spaces`
- `space_members`
- `space_timeline_entries`
- `catalog_releases`
- `token_feedback`

**Step 4: Re-run migration and startup tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/alembic/versions apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py
git commit -m "refactor(api): replace alembic history with clean baseline"
```

### Task 4: Delete Legacy Migration And Compatibility Tests

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_alembic_migrations.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_startup.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secrets_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_auth.py`

**Step 1: Write the failing simplification pass**

Delete tests that only verify:
- upgrade from legacy capability access policy
- startup migration from partially old schemas
- legacy secret input normalization
- legacy runtime token fallback

Then add one replacement assertion per domain proving the new canonical path works end-to-end.

Example:

```python
def test_secret_create_accepts_only_current_contract(management_client):
    response = management_client.post(...)
    assert response.status_code == 201
```

**Step 2: Run the focused suite**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py apps/api/tests/test_secrets_api.py apps/api/tests/test_management_auth.py -q
```

Expected: FAIL if any old compatibility helper or old revision reference is still required.

**Step 3: Write the minimal implementation**

Remove:
- tests that start from old revision ids
- tests that insert legacy `access_policy` payloads expecting migration rewrite
- tests that validate old schema backfill behavior

Keep:
- current bootstrap
- current management session
- current review flow
- current secret staging/promotion

**Step 4: Re-run the focused suite**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py apps/api/tests/test_secrets_api.py apps/api/tests/test_management_auth.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/tests/test_alembic_migrations.py apps/api/tests/test_startup.py apps/api/tests/test_secrets_api.py apps/api/tests/test_management_auth.py
git commit -m "test(api): drop legacy migration compatibility coverage"
```

### Task 5: Tighten ORM And Runtime Models To Baseline-Only Semantics

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/secret.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/capability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/task.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/playbook.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/secrets.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/reviews.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_secrets_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_review_queue_api.py`

**Step 1: Write the failing tests**

Add assertions that baseline-only fields stay truthful and minimal:

```python
def test_secret_review_flow_uses_only_active_pending_rejected_states(...):
    ...
    assert response.json()["publication_status"] in {"pending_review", "active", "rejected"}
```

**Step 2: Run the focused suite**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_secrets_api.py apps/api/tests/test_review_queue_api.py -q
```

Expected: FAIL if any old enum, field alias, or transitional state is still exposed.

**Step 3: Write the minimal implementation**

Verify all reviewable models and responses expose only:
- `pending_review`
- `active`
- `rejected`

Do not leave dead comments or placeholder states like `approved` / `expired` in schemas or docs unless still actively produced.

**Step 4: Re-run the focused suite**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests/test_secrets_api.py apps/api/tests/test_review_queue_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_tasks_api.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/app/orm/secret.py apps/api/app/orm/capability.py apps/api/app/orm/task.py apps/api/app/orm/playbook.py apps/api/app/routes/secrets.py apps/api/app/routes/reviews.py apps/api/tests/test_secrets_api.py apps/api/tests/test_review_queue_api.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_playbooks_api.py apps/api/tests/test_tasks_api.py
git commit -m "refactor(api): tighten review state model to canonical statuses"
```

### Task 6: Final Full Verification And Audit Closeout

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/audits/`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/implementation/`
- Test: entire `apps/api/tests` suite

**Step 1: Run the red-to-green full verification checklist**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests -q
uv run --with ruff ruff check apps/api/app apps/api/tests
```

Expected: PASS for both.

**Step 2: If anything fails, fix only baseline-contract regressions**

Do not reintroduce compatibility branches. Fix the tests or implementation to the new single-contract design.

**Step 3: Write the closeout audit note**

Document:
- removed compatibility surfaces
- new single baseline revision id
- removed legacy tests
- remaining deliberate exceptions, if any

Suggested artifact:

`/Users/lvxiaoer/Documents/codeWork/agentShare/docs/audits/2026-04-05-api-baseline-reset-closeout.md`

**Step 4: Re-run the final verification**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
uv run pytest apps/api/tests -q
uv run --with ruff ruff check apps/api/app apps/api/tests
```

Expected: PASS

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api docs/audits/2026-04-05-api-baseline-reset-closeout.md
git commit -m "refactor(api): reset backend to clean baseline"
```

### Notes For Execution

- Assume there is no data to migrate and no need for downgrade compatibility.
- Prefer deleting code over preserving dormant compatibility switches.
- Keep current product behavior for bootstrap, management sessions, review workflow, secret staging, task targeting, and audit visibility.
- If a test only exists to validate migration from older schema versions, delete it rather than rewriting implementation around it.
- If a helper only exists to transform legacy payloads, delete the helper and tighten the schema instead.

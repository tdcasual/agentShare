# OpenClaw Agent Access Token Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `OpenClawAgent` the only agent runtime model, make `AccessToken` an independent first-class credential, and remove legacy agent/token/tool compatibility surfaces after migration.

**Architecture:** Keep in-project execution centered on `OpenClawAgent` plus `session_key`. Replace the legacy `AgentIdentityModel` + `AgentTokenModel` hierarchy with standalone `AccessToken` credentials that authenticate remote callers directly through token policy, scopes, labels, and audit subject metadata. Remove legacy agent search, `/api/agents` management, token-under-agent routes, token-target naming, and legacy tool-name aliases once all callers use the new primitives.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Next.js, TypeScript, SWR, Vitest, OpenAPI contract tests.

---

## Target Model

After this plan, the product vocabulary is:

- `OpenClawAgent`: in-project runtime identity, workspace, sandbox, policies, files, sessions, dream runs, and memory.
- `OpenClawSession`: an agent-bound runtime session authenticated with `session_key`.
- `AccessToken`: standalone remote-access credential authenticated with `Authorization: Bearer <token>`.
- `ManagementSession`: human operator cookie session.
- `BootstrapKey`: one-time first-owner setup credential.

The product vocabulary must no longer include:

- legacy agent identity
- agent token
- token attached to agent
- external remote agent profile
- legacy tool name
- token-targeted task wording

Remote callers are still supported, but they authenticate as `AccessToken` principals rather than as hidden or implied remote agents.

## Cleanup Rule

Do not leave compatibility shims unless a later task explicitly says to keep one temporarily. The final cleanup tasks must delete obsolete files, routes, tests, docs, OpenAPI examples, i18n copy, and frontend hooks. The repository should fail search checks for the old vocabulary except in historical `docs/plans` files.

---

### Task 1: Characterize Current Legacy Coupling

**Files:**
- Create: `apps/api/tests/test_access_tokens_api.py`
- Create: `apps/api/tests/test_access_token_auth.py`
- Modify: `apps/api/tests/test_openapi_contract.py`
- Read: `apps/api/app/routes/agents.py`
- Read: `apps/api/app/routes/agent_tokens.py`
- Read: `apps/api/app/auth.py`
- Read: `apps/api/app/services/access_policy.py`
- Read: `apps/api/app/services/openclaw_tool_catalog_service.py`

**Step 1: Write failing API contract tests for the desired public surface**

Add assertions to `apps/api/tests/test_openapi_contract.py`:

```python
def test_openapi_exposes_access_tokens_not_legacy_agents(client):
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]

    assert "/api/access-tokens" in paths
    assert "/api/access-tokens/{token_id}/revoke" in paths
    assert "/api/access-tokens/{token_id}/feedback" in paths

    assert "/api/agents" not in paths
    assert "/api/agents/{agent_id}/tokens" not in paths
    assert "/api/agent-tokens/{token_id}/revoke" not in paths
    assert "/api/agent-tokens/{token_id}/feedback" not in paths
```

**Step 2: Write failing authentication tests for standalone tokens**

Create `apps/api/tests/test_access_token_auth.py`:

```python
from app.services.access_token_service import mint_access_token


def test_access_token_auth_resolves_token_principal(client, db_session):
    token, raw_token = mint_access_token(
        db_session,
        display_name="CI remote runner",
        subject_type="automation",
        subject_id="ci-runner",
        scopes=["runtime"],
        labels={"env": "staging"},
        issued_by_actor_type="human",
        issued_by_actor_id="owner-test",
    )
    db_session.commit()

    response = client.get("/api/runtime/me", headers={"Authorization": f"Bearer {raw_token}"})

    assert response.status_code == 200
    assert response.json()["auth_method"] == "access_token"
    assert response.json()["token_id"] == token.id
    assert response.json()["subject_type"] == "automation"
    assert response.json()["subject_id"] == "ci-runner"
```

**Step 3: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_openapi_contract.py apps/api/tests/test_access_token_auth.py -q
```

Expected: FAIL because `/api/access-tokens`, `access_token_service`, and `/api/runtime/me` do not exist yet, and old routes are still present.

**Step 4: Commit**

```bash
git add apps/api/tests/test_openapi_contract.py apps/api/tests/test_access_token_auth.py
git commit -m "test: define access token target surface"
```

---

### Task 2: Add Standalone AccessToken Storage

**Files:**
- Create: `apps/api/app/orm/access_token.py`
- Create: `apps/api/app/repositories/access_token_repo.py`
- Create: `apps/api/app/schemas/access_tokens.py`
- Create: `apps/api/app/services/access_token_service.py`
- Modify: `apps/api/app/orm/__init__.py`
- Create: `apps/api/alembic/versions/20260419_01_access_tokens.py`
- Test: `apps/api/tests/test_access_tokens_api.py`
- Test: `apps/api/tests/test_alembic_migrations.py`

**Step 1: Write failing model and migration tests**

Add to `apps/api/tests/test_alembic_migrations.py`:

```python
def test_access_token_migration_creates_standalone_token_table(tmp_path):
    db_path = tmp_path / "access-token.db"
    database_url = f"sqlite:///{db_path}"

    _run_alembic_upgrade(database_url, "head")

    engine = create_engine(database_url)
    try:
        inspector = inspect(engine)
        columns = {column["name"] for column in inspector.get_columns("access_tokens")}
        assert {
            "id",
            "display_name",
            "token_hash",
            "token_prefix",
            "status",
            "subject_type",
            "subject_id",
            "scopes",
            "labels",
            "policy",
            "completed_runs",
            "successful_runs",
            "trust_score",
        }.issubset(columns)
    finally:
        engine.dispose()
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_alembic_migrations.py::test_access_token_migration_creates_standalone_token_table -q
```

Expected: FAIL because `access_tokens` does not exist.

**Step 3: Implement storage**

Create `apps/api/app/orm/access_token.py`:

```python
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class AccessTokenModel(Base, TimestampMixin):
    __tablename__ = "access_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    token_prefix: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    subject_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_id: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    issued_by_actor_type: Mapped[str] = mapped_column(String, nullable=False)
    issued_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[list] = mapped_column(JSON, default=list)
    labels: Mapped[dict] = mapped_column(JSON, default=dict)
    policy: Mapped[dict] = mapped_column(JSON, default=dict)
    completed_runs: Mapped[int] = mapped_column(Integer, default=0)
    successful_runs: Mapped[int] = mapped_column(Integer, default=0)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0)
    last_feedback_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trust_score: Mapped[float] = mapped_column(Float, default=0.0)
```

Create repository methods for `get`, `find_by_token_hash`, `list_all`, `create`, `update`, and `revoke`.

Create schemas:

```python
from datetime import datetime
from pydantic import BaseModel, Field


class AccessTokenCreate(BaseModel):
    display_name: str
    subject_type: str = Field(default="remote_caller")
    subject_id: str
    scopes: list[str] = Field(default_factory=list)
    labels: dict[str, str] = Field(default_factory=dict)
    policy: dict = Field(default_factory=dict)
    expires_at: datetime | None = None


class AccessTokenResponse(BaseModel):
    id: str
    display_name: str
    token_prefix: str
    status: str
    subject_type: str
    subject_id: str
    scopes: list[str]
    labels: dict[str, str]
    policy: dict
    expires_at: datetime | None = None
    last_used_at: datetime | None = None
    trust_score: float = 0.0
    api_key: str | None = None
```

Create service functions equivalent to the current token service but without `agent_id`.

**Step 4: Run migration tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_alembic_migrations.py::test_access_token_migration_creates_standalone_token_table -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/access_token.py apps/api/app/repositories/access_token_repo.py apps/api/app/schemas/access_tokens.py apps/api/app/services/access_token_service.py apps/api/app/orm/__init__.py apps/api/alembic/versions/20260419_01_access_tokens.py apps/api/tests/test_alembic_migrations.py
git commit -m "feat: add standalone access token storage"
```

---

### Task 3: Add AccessToken Management Routes

**Files:**
- Create: `apps/api/app/routes/access_tokens.py`
- Modify: `apps/api/app/routes/__init__.py`
- Test: `apps/api/tests/test_access_tokens_api.py`
- Test: `apps/api/tests/test_management_roles.py`

**Step 1: Write failing route tests**

Create tests:

```python
def test_admin_can_create_list_and_revoke_access_tokens(management_client):
    created = management_client.post(
        "/api/access-tokens",
        json={
            "display_name": "Remote build runner",
            "subject_type": "automation",
            "subject_id": "github-actions",
            "scopes": ["runtime"],
            "labels": {"env": "staging"},
        },
    )

    assert created.status_code == 201
    payload = created.json()
    assert payload["api_key"]
    assert payload["subject_type"] == "automation"
    assert "agent_id" not in payload

    listed = management_client.get("/api/access-tokens")
    assert listed.status_code == 200
    assert {item["id"] for item in listed.json()["items"]} == {payload["id"]}

    revoked = management_client.post(f"/api/access-tokens/{payload['id']}/revoke")
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"
```

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_access_tokens_api.py -q
```

Expected: FAIL because routes do not exist.

**Step 3: Implement routes**

Create `/api/access-tokens` routes:

- `GET /api/access-tokens`
- `POST /api/access-tokens`
- `POST /api/access-tokens/{token_id}/revoke`

Use existing management actions initially:

- `tokens:list`
- `tokens:issue`
- `tokens:revoke`

Return `api_key` only on create.

**Step 4: Run tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_access_tokens_api.py apps/api/tests/test_management_roles.py -q
```

Expected: PASS after tests are updated from legacy agent token routes to access-token routes.

**Step 5: Commit**

```bash
git add apps/api/app/routes/access_tokens.py apps/api/app/routes/__init__.py apps/api/tests/test_access_tokens_api.py apps/api/tests/test_management_roles.py
git commit -m "feat: expose standalone access token management"
```

---

### Task 4: Replace Runtime Principal Resolution

**Files:**
- Modify: `apps/api/app/models/runtime_principal.py`
- Modify: `apps/api/app/auth.py`
- Modify: `apps/api/app/services/openclaw_runtime_service.py`
- Test: `apps/api/tests/test_access_token_auth.py`
- Test: `apps/api/tests/test_agent_auth.py`
- Test: `apps/api/tests/test_mcp_server.py`

**Step 1: Write failing principal shape tests**

Update `apps/api/tests/test_access_token_auth.py`:

```python
def test_access_token_runtime_principal_has_no_agent_identity(client, db_session):
    token, raw_token = mint_access_token(
        db_session,
        display_name="Partner runtime",
        subject_type="remote_agent",
        subject_id="partner-runtime-1",
        scopes=["runtime"],
        labels={"team": "partner"},
        issued_by_actor_type="human",
        issued_by_actor_id="owner-test",
    )
    db_session.commit()

    response = client.get("/api/runtime/me", headers={"Authorization": f"Bearer {raw_token}"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["actor_type"] == "access_token"
    assert payload["token_id"] == token.id
    assert "agent_id" not in payload
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_access_token_auth.py -q
```

Expected: FAIL because current runtime principal still normalizes bearer tokens into agent identities.

**Step 3: Implement principal changes**

Change `RuntimePrincipal` to support:

```python
class RuntimePrincipal(BaseModel):
    actor_type: Literal["openclaw_agent", "access_token"]
    id: str
    display_name: str
    auth_method: Literal["session_key", "access_token"]
    token_id: str | None = None
    subject_type: str | None = None
    subject_id: str | None = None
    scopes: list[str] = Field(default_factory=list)
    labels: dict[str, str] = Field(default_factory=dict)
    allowed_capability_ids: list[str] = Field(default_factory=list)
    allowed_task_types: list[str] = Field(default_factory=list)
    risk_tier: str = "medium"
    session_id: str | None = None
    session_key: str | None = None
    workspace_root: str | None = None
    agent_dir: str | None = None
    sandbox_mode: str | None = None
    tools_policy: dict = Field(default_factory=dict)
    skills_policy: dict = Field(default_factory=dict)
    dream_policy: dict = Field(default_factory=dict)
```

Change `resolve_agent_from_api_key` into `resolve_runtime_principal`:

- First resolve OpenClaw session keys.
- Then resolve standalone access tokens.
- Do not import `AgentRepository` or `AgentTokenRepository`.

Add `/api/runtime/me` as the generic runtime introspection route.

**Step 4: Run targeted auth tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_access_token_auth.py apps/api/tests/test_agent_auth.py apps/api/tests/test_mcp_server.py -q
```

Expected: PASS after tests are updated to use `/api/runtime/me` and new principal shape.

**Step 5: Commit**

```bash
git add apps/api/app/models/runtime_principal.py apps/api/app/auth.py apps/api/app/services/openclaw_runtime_service.py apps/api/tests/test_access_token_auth.py apps/api/tests/test_agent_auth.py apps/api/tests/test_mcp_server.py
git commit -m "refactor: resolve bearer auth as runtime principals"
```

---

### Task 5: Rename Token-Targeted Tasks To Credential Assignments

**Files:**
- Modify: `apps/api/app/orm/task_target.py`
- Modify: `apps/api/app/schemas/tasks.py`
- Modify: `apps/api/app/repositories/task_target_repo.py`
- Modify: `apps/api/app/services/task_service.py`
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/routes/runs.py`
- Create: `apps/api/alembic/versions/20260419_02_task_access_token_targets.py`
- Test: `apps/api/tests/test_tasks_api.py`
- Test: `apps/api/tests/test_task_targets_api.py`
- Test: `apps/api/tests/test_runs_api.py`

**Step 1: Write failing task API tests**

Update task creation tests to use:

```python
response = management_client.post(
    "/api/tasks",
    json={
        "title": "Sync config",
        "task_type": "config_sync",
        "target_mode": "explicit_access_tokens",
        "target_access_token_ids": [access_token_id],
    },
)
```

Assert response no longer contains `target_token_ids`:

```python
assert response.json()["target_access_token_ids"] == [access_token_id]
assert "target_token_ids" not in response.json()
```

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_tasks_api.py apps/api/tests/test_task_targets_api.py -q
```

Expected: FAIL because current schemas and storage use `target_token_ids` and `target_token_id`.

**Step 3: Implement schema and storage rename**

Rename concepts:

- `target_token_ids` -> `target_access_token_ids`
- `explicit_tokens` -> `explicit_access_tokens`
- `target_token_id` -> `target_access_token_id`
- `claimed_by_token_id` -> `claimed_by_access_token_id`
- `token_id` on runs -> `access_token_id`

Keep database migrations destructive and direct because compatibility is not required.

**Step 4: Run task and run tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_tasks_api.py apps/api/tests/test_task_targets_api.py apps/api/tests/test_runs_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/task_target.py apps/api/app/schemas/tasks.py apps/api/app/repositories/task_target_repo.py apps/api/app/services/task_service.py apps/api/app/routes/tasks.py apps/api/app/routes/runs.py apps/api/alembic/versions/20260419_02_task_access_token_targets.py apps/api/tests/test_tasks_api.py apps/api/tests/test_task_targets_api.py apps/api/tests/test_runs_api.py
git commit -m "refactor: target tasks by standalone access token"
```

---

### Task 6: Update Capability Access Policy

**Files:**
- Modify: `apps/api/app/models/access_policy.py`
- Modify: `apps/api/app/services/access_policy.py`
- Modify: `apps/api/app/services/capability_service.py`
- Modify: `apps/api/app/services/gateway.py`
- Test: `apps/api/tests/test_capability_access_policy.py`
- Test: `apps/api/tests/test_capabilities_api.py`
- Test: `apps/api/tests/test_invoke_api.py`
- Test: `apps/api/tests/test_lease_api.py`

**Step 1: Write failing access-policy tests**

Update selectors to only support:

```python
{"kind": "access_token", "ids": ["access-token-1"]}
{"kind": "access_token_label", "key": "env", "values": ["production"]}
```

Add rejection tests:

```python
def test_access_policy_rejects_legacy_agent_selector():
    with pytest.raises(ValueError):
        CapabilityAccessPolicy.model_validate({
            "mode": "selectors",
            "selectors": [{"kind": "agent", "ids": ["agent-1"]}],
        })
```

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_capability_access_policy.py -q
```

Expected: FAIL because `agent`, `token`, and `token_label` are still accepted.

**Step 3: Implement new policy vocabulary**

Change literals:

```python
CapabilityAccessPolicyMode = Literal["all_access_tokens", "selectors"]
CapabilityAccessSelectorKind = Literal["access_token", "access_token_label"]
```

Remove:

- `explicit_tokens` normalization
- `agent` selector
- `token` selector
- `token_label` selector
- `AgentRepository` validation

Validate token ids through `AccessTokenRepository`.

**Step 4: Run capability suite**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_capability_access_policy.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_invoke_api.py apps/api/tests/test_lease_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/models/access_policy.py apps/api/app/services/access_policy.py apps/api/app/services/capability_service.py apps/api/app/services/gateway.py apps/api/tests/test_capability_access_policy.py apps/api/tests/test_capabilities_api.py apps/api/tests/test_invoke_api.py apps/api/tests/test_lease_api.py
git commit -m "refactor: express capability access through access tokens"
```

---

### Task 7: Rename Feedback From TokenFeedback To AccessTokenFeedback

**Files:**
- Move: `apps/api/app/orm/token_feedback.py` -> `apps/api/app/orm/access_token_feedback.py`
- Move: `apps/api/app/repositories/token_feedback_repo.py` -> `apps/api/app/repositories/access_token_feedback_repo.py`
- Move: `apps/api/app/schemas/token_feedback.py` -> `apps/api/app/schemas/access_token_feedback.py`
- Move: `apps/api/app/services/token_feedback_service.py` -> `apps/api/app/services/access_token_feedback_service.py`
- Modify: `apps/api/app/routes/token_feedback.py`
- Create: `apps/api/alembic/versions/20260419_03_access_token_feedback.py`
- Test: `apps/api/tests/test_token_feedback_api.py`

**Step 1: Write failing feedback route tests**

Update route expectations:

```python
feedback = management_client.post(
    f"/api/task-targets/{task_target_id}/feedback",
    json={"score": 1, "verdict": "approved", "summary": "Looks good"},
)
assert feedback.status_code == 201
assert feedback.json()["access_token_id"] == access_token_id

listed = management_client.get(f"/api/access-tokens/{access_token_id}/feedback")
assert listed.status_code == 200
assert listed.json()["items"][0]["access_token_id"] == access_token_id
```

**Step 2: Run tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_token_feedback_api.py -q
```

Expected: FAIL because current route is `/api/agent-tokens/{token_id}/feedback` and model uses `token_id`.

**Step 3: Implement rename**

Rename objects and route:

- `TokenFeedbackModel` -> `AccessTokenFeedbackModel`
- `token_feedback` table -> `access_token_feedback`
- `token_id` -> `access_token_id`
- `GET /api/agent-tokens/{token_id}/feedback` -> `GET /api/access-tokens/{token_id}/feedback`
- Event metadata key `token_id` -> `access_token_id`

**Step 4: Run feedback tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_token_feedback_api.py apps/api/tests/test_events_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/access_token_feedback.py apps/api/app/repositories/access_token_feedback_repo.py apps/api/app/schemas/access_token_feedback.py apps/api/app/services/access_token_feedback_service.py apps/api/app/routes/token_feedback.py apps/api/alembic/versions/20260419_03_access_token_feedback.py apps/api/tests/test_token_feedback_api.py apps/api/tests/test_events_api.py
git rm apps/api/app/orm/token_feedback.py apps/api/app/repositories/token_feedback_repo.py apps/api/app/schemas/token_feedback.py apps/api/app/services/token_feedback_service.py
git commit -m "refactor: rename token feedback to access token feedback"
```

---

### Task 8: Remove Legacy Agent Routes And Models

**Files:**
- Delete: `apps/api/app/routes/agents.py`
- Delete: `apps/api/app/routes/agent_tokens.py`
- Delete: `apps/api/app/orm/agent.py`
- Delete: `apps/api/app/orm/agent_token.py`
- Delete: `apps/api/app/repositories/agent_repo.py`
- Delete: `apps/api/app/repositories/agent_token_repo.py`
- Delete: `apps/api/app/schemas/agents.py`
- Delete: `apps/api/app/schemas/agent_tokens.py`
- Delete: `apps/api/app/services/agent_token_service.py`
- Modify: `apps/api/app/routes/__init__.py`
- Modify: `apps/api/app/factory.py`
- Modify: `apps/api/app/services/session_service.py`
- Modify: `apps/api/app/services/search_service.py`
- Modify: `apps/api/app/services/demo_seed_service.py`
- Create: `apps/api/alembic/versions/20260419_04_drop_legacy_agents.py`
- Test: `apps/api/tests/test_openapi_contract.py`
- Test: `apps/api/tests/test_search_api.py`
- Test: `apps/api/tests/test_startup.py`

**Step 1: Write failing no-legacy tests**

Add a static test:

```python
from pathlib import Path


def test_api_source_no_longer_imports_legacy_agent_repositories():
    root = Path("apps/api/app")
    forbidden = [
        "AgentRepository",
        "AgentTokenRepository",
        "AgentIdentityModel",
        "AgentTokenModel",
        "agent_token_service",
    ]
    offenders = []
    for path in root.rglob("*.py"):
        if "alembic" in path.parts:
            continue
        text = path.read_text()
        for needle in forbidden:
            if needle in text:
                offenders.append((str(path), needle))
    assert offenders == []
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_openapi_contract.py::test_api_source_no_longer_imports_legacy_agent_repositories -q
```

Expected: FAIL with many offenders.

**Step 3: Remove legacy code**

Remove legacy route registration and imports. Update:

- Bootstrap startup no longer creates legacy bootstrap agent records.
- Demo seeding no longer creates `AgentIdentityModel`.
- Search only uses `OpenClawAgentRepository`.
- Runtime auth no longer checks `AgentTokenRepository`.
- OpenAPI no longer exposes `/api/agents` or `/api/agent-tokens`.

**Step 4: Run legacy removal tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_openapi_contract.py apps/api/tests/test_search_api.py apps/api/tests/test_startup.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git rm apps/api/app/routes/agents.py apps/api/app/routes/agent_tokens.py apps/api/app/orm/agent.py apps/api/app/orm/agent_token.py apps/api/app/repositories/agent_repo.py apps/api/app/repositories/agent_token_repo.py apps/api/app/schemas/agents.py apps/api/app/schemas/agent_tokens.py apps/api/app/services/agent_token_service.py
git add apps/api/app/routes/__init__.py apps/api/app/factory.py apps/api/app/services/session_service.py apps/api/app/services/search_service.py apps/api/app/services/demo_seed_service.py apps/api/alembic/versions/20260419_04_drop_legacy_agents.py apps/api/tests/test_openapi_contract.py apps/api/tests/test_search_api.py apps/api/tests/test_startup.py
git commit -m "refactor: remove legacy agent and agent token model"
```

---

### Task 9: Remove Legacy Tool Name Compatibility

**Files:**
- Modify: `apps/api/app/services/openclaw_tool_catalog_service.py`
- Modify: `apps/api/app/mcp/tools.py`
- Test: `apps/api/tests/test_openclaw_tool_catalog.py`
- Test: `apps/api/tests/test_mcp_server.py`

**Step 1: Write failing no-alias tests**

Update `apps/api/tests/test_openclaw_tool_catalog.py`:

```python
def test_tool_catalog_has_no_legacy_names():
    catalog = list_openclaw_tool_catalog()
    assert all("legacy_name" not in item for item in catalog)
    assert canonical_tool_name("list_tasks") is None
    assert canonical_tool_name("tasks.list") == "tasks.list"
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_openclaw_tool_catalog.py -q
```

Expected: FAIL because catalog still returns `legacy_name`.

**Step 3: Remove alias support**

Change `OPENCLAW_TOOL_CATALOG` to only store canonical names and descriptions. Delete:

- `legacy_name` fields
- `LEGACY_TOOL_ALIASES`
- alias branch in `canonical_tool_name`
- `legacyName` output in MCP tool catalog

**Step 4: Run MCP tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_openclaw_tool_catalog.py apps/api/tests/test_mcp_server.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/services/openclaw_tool_catalog_service.py apps/api/app/mcp/tools.py apps/api/tests/test_openclaw_tool_catalog.py apps/api/tests/test_mcp_server.py
git commit -m "refactor: remove legacy tool aliases"
```

---

### Task 10: Update Frontend API Client And Token Page

**Files:**
- Modify: `apps/control-plane-v3/src/lib/api-client.ts`
- Modify: `apps/control-plane-v3/src/lib/api.ts`
- Modify: `apps/control-plane-v3/src/lib/swr-config.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/api.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/hooks.ts`
- Modify: `apps/control-plane-v3/src/domains/identity/types.ts`
- Modify: `apps/control-plane-v3/src/app/tokens/page.tsx`
- Modify: `apps/control-plane-v3/src/app/tokens/page.test.tsx`
- Modify: `apps/control-plane-v3/src/i18n/messages/en.json`
- Modify: `apps/control-plane-v3/src/i18n/messages/zh-CN.json`

**Step 1: Write failing frontend tests**

Update tests to expect access-token wording and no agent grouping:

```typescript
it('renders standalone access tokens without agent grouping', async () => {
  // Mock /api/access-tokens with two tokens.
  // Assert no "Create agent" CTA is present.
  // Assert "Issue access token" CTA is present.
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/tokens/page.test.tsx src/lib/swr-config.test.ts
```

Expected: FAIL because current UI groups tokens under agents.

**Step 3: Implement frontend rename and simplification**

Replace frontend concepts:

- `AgentToken` -> `AccessToken`
- `createAgentToken` -> `createAccessToken`
- `getAgentTokens` -> `getAccessTokens`
- `revokeAgentToken` -> `revokeAccessToken`
- remove `useAgentsWithTokens`
- remove create-agent modal from `/tokens`
- remove `issuingAgentId`
- remove `agent_id` display from token cards

Keep OpenClaw agents visible only under `/identities`.

**Step 4: Run frontend targeted tests**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/tokens/page.test.tsx src/lib/swr-config.test.ts src/app/identities/page.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/api-client.ts apps/control-plane-v3/src/lib/api.ts apps/control-plane-v3/src/lib/swr-config.ts apps/control-plane-v3/src/domains/identity/api.ts apps/control-plane-v3/src/domains/identity/hooks.ts apps/control-plane-v3/src/domains/identity/types.ts apps/control-plane-v3/src/app/tokens/page.tsx apps/control-plane-v3/src/app/tokens/page.test.tsx apps/control-plane-v3/src/i18n/messages/en.json apps/control-plane-v3/src/i18n/messages/zh-CN.json
git commit -m "refactor(web): manage standalone access tokens"
```

---

### Task 11: Update Task UI And Copy For Access Tokens

**Files:**
- Modify: `apps/control-plane-v3/src/lib/api-client.ts`
- Modify: `apps/control-plane-v3/src/app/tasks/page.tsx`
- Modify: `apps/control-plane-v3/src/app/tasks/use-tasks-form.ts`
- Modify: `apps/control-plane-v3/src/app/tasks/use-tasks-page.ts`
- Modify: `apps/control-plane-v3/src/app/tasks/page.test.tsx`
- Modify: `apps/control-plane-v3/src/i18n/messages/en.json`
- Modify: `apps/control-plane-v3/src/i18n/messages/zh-CN.json`

**Step 1: Write failing task UI tests**

Update task tests to assert:

- form field label uses `Access tokens`
- payload sends `target_access_token_ids`
- no UI text says `remote agent token` or `agent token`

**Step 2: Run tests to verify they fail**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/tasks/page.test.tsx
```

Expected: FAIL until form payload and copy are renamed.

**Step 3: Implement task UI changes**

Update the task create payload to use:

```typescript
target_access_token_ids?: string[];
target_mode?: 'explicit_access_tokens' | 'broadcast';
```

Use `/api/access-tokens` as the token source.

**Step 4: Run tests**

Run:

```bash
cd apps/control-plane-v3
npm test -- --run src/app/tasks/page.test.tsx src/app/tokens/page.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/lib/api-client.ts apps/control-plane-v3/src/app/tasks/page.tsx apps/control-plane-v3/src/app/tasks/use-tasks-form.ts apps/control-plane-v3/src/app/tasks/use-tasks-page.ts apps/control-plane-v3/src/app/tasks/page.test.tsx apps/control-plane-v3/src/i18n/messages/en.json apps/control-plane-v3/src/i18n/messages/zh-CN.json
git commit -m "refactor(web): target tasks by access token"
```

---

### Task 12: Rewrite Documentation Around The New Credential Model

**Files:**
- Modify: `README.md`
- Modify: `docs/guides/agent-server-first.md`
- Rename: `docs/guides/admin-bootstrap-and-token-ops.md` -> `docs/guides/admin-bootstrap-and-access-token-ops.md`
- Modify: `docs/guides/agent-quickstart.md`
- Modify: `docs/guides/mcp-quickstart.md`
- Modify: `docs/guides/dream-mode-quickstart.md`
- Modify: `docs/guides/production-deployment.md`
- Modify: `docs/guides/production-security.md`

**Step 1: Write a docs vocabulary check**

Create `tests/ops/test_release_vocabulary.py`:

```python
from pathlib import Path


def test_current_docs_do_not_use_removed_agent_token_vocabulary():
    roots = [Path("README.md"), Path("docs/guides")]
    forbidden = [
        "agent token",
        "agent tokens",
        "remote agent profile",
        "/api/agents",
        "/api/agent-tokens",
        "legacy_name",
        "legacy tool",
    ]
    offenders = []
    for root in roots:
        paths = [root] if root.is_file() else list(root.rglob("*.md"))
        for path in paths:
            text = path.read_text().lower()
            for needle in forbidden:
                if needle in text:
                    offenders.append((str(path), needle))
    assert offenders == []
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_release_vocabulary.py -q
```

Expected: FAIL with many old docs references.

**Step 3: Rewrite docs**

Use this terminology:

- `OpenClaw agent` for in-project runtime workspaces.
- `session_key` for OpenClaw runtime sessions.
- `AccessToken` for standalone remote callers.
- `remote caller` for anything outside the project using an access token.

Remove statements that imply:

- tokens belong to agents
- remote agents have separate profiles
- legacy tool names are supported
- `/api/agents` is a management surface

**Step 4: Run docs vocabulary test**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_release_vocabulary.py -q
```

Expected: PASS, excluding historical `docs/plans` files.

**Step 5: Commit**

```bash
git mv docs/guides/admin-bootstrap-and-token-ops.md docs/guides/admin-bootstrap-and-access-token-ops.md
git add README.md docs/guides/agent-server-first.md docs/guides/admin-bootstrap-and-access-token-ops.md docs/guides/agent-quickstart.md docs/guides/mcp-quickstart.md docs/guides/dream-mode-quickstart.md docs/guides/production-deployment.md docs/guides/production-security.md tests/ops/test_release_vocabulary.py
git commit -m "docs: define openclaw agent and access token model"
```

---

### Task 13: Delete Obsolete Tests And Fixtures

**Files:**
- Delete: `apps/api/tests/test_agent_tokens_api.py`
- Delete or rewrite: `apps/api/tests/test_api_key_auth.py`
- Modify: `apps/api/tests/conftest.py`
- Modify: `apps/api/tests/test_runtime.py`
- Modify: `apps/api/tests/test_authorization_policy.py`
- Modify: `apps/api/tests/test_management_roles.py`
- Modify: `apps/api/tests/test_review_queue_api.py`
- Modify: `apps/api/tests/test_capabilities_api.py`
- Modify: `apps/api/tests/test_approvals_api.py`
- Modify: `apps/api/tests/test_tasks_api.py`
- Modify: `apps/api/tests/test_events_api.py`

**Step 1: Add final source vocabulary test**

Create `tests/ops/test_removed_legacy_source.py`:

```python
from pathlib import Path


def test_source_no_longer_contains_removed_legacy_agent_token_terms():
    allowed_roots = {"docs/plans"}
    forbidden = [
        "AgentToken",
        "agent_tokens",
        "agent_token",
        "AgentIdentityModel",
        "AgentRepository",
        "legacy_name",
        "LEGACY_TOOL_ALIASES",
        "target_token_ids",
        "target_token_id",
        "/api/agents",
        "/api/agent-tokens",
    ]
    offenders = []
    for root in [Path("apps/api/app"), Path("apps/api/tests"), Path("apps/control-plane-v3/src")]:
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix not in {".py", ".ts", ".tsx", ".json"}:
                continue
            text = path.read_text()
            for needle in forbidden:
                if needle in text:
                    offenders.append((str(path), needle))
    assert offenders == []
```

**Step 2: Run test to verify it fails**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_removed_legacy_source.py -q
```

Expected: FAIL until old tests and fixtures are removed or rewritten.

**Step 3: Remove or rewrite old tests**

Delete tests whose only purpose was legacy agent-token behavior. Rewrite tests that still cover valid behavior with `AccessToken` fixtures.

**Step 4: Run API test suite**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests tests/ops -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git rm apps/api/tests/test_agent_tokens_api.py
git add apps/api/tests tests/ops/test_removed_legacy_source.py
git commit -m "test: remove legacy agent token coverage"
```

---

### Task 14: Final Release Cleanup

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `scripts/ops/verify-control-plane.sh`
- Modify: `scripts/ops/smoke-test.sh`
- Modify: `apps/api/tests/test_openapi_contract.py`
- Modify: `apps/control-plane-v3/src/app/control-plane-pages.test.ts`
- Modify: `README.md`

**Step 1: Add final release gate checks**

Ensure `scripts/ops/verify-control-plane.sh` runs:

```bash
PYTHONPATH=apps/api "${VENV_PYTEST}" apps/api/tests tests/ops -q
```

Ensure `tests/ops/test_removed_legacy_source.py` and `tests/ops/test_release_vocabulary.py` are included.

**Step 2: Run full verification**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: PASS.

**Step 3: Run production build verification**

Run:

```bash
docker compose config >/dev/null
docker build -f apps/api/Dockerfile .
docker build -f apps/control-plane-v3/Dockerfile .
```

Expected: all commands exit 0.

**Step 4: Run final forbidden-term scan**

Run:

```bash
rg -n "AgentToken|agent_tokens|agent token|legacy_name|LEGACY_TOOL_ALIASES|target_token_ids|/api/agents|/api/agent-tokens" apps README.md docs/guides tests/ops
```

Expected: no matches except intentionally documented migration notes if any are explicitly approved. Prefer zero matches.

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml scripts/ops/verify-control-plane.sh scripts/ops/smoke-test.sh apps/api/tests/test_openapi_contract.py apps/control-plane-v3/src/app/control-plane-pages.test.ts README.md
git commit -m "chore: enforce simplified release vocabulary"
```

---

## Final Acceptance Checklist

- `OpenClawAgent` is the only agent runtime model.
- Remote callers use standalone `AccessToken` credentials.
- Bearer auth resolves to either `openclaw_agent` via `session_key` or `access_token` via standalone token.
- `/api/agents`, `/api/agents/{agent_id}/tokens`, and `/api/agent-tokens/*` do not exist.
- `AgentIdentityModel`, `AgentTokenModel`, `AgentRepository`, and `AgentTokenRepository` are deleted.
- Tool catalog accepts only canonical tool names.
- Frontend `/tokens` manages standalone access tokens, not agents with nested tokens.
- Task targeting uses `target_access_token_ids`.
- Feedback uses `access_token_id`.
- Docs describe `OpenClawAgent`, `session_key`, `AccessToken`, `ManagementSession`, and `BootstrapKey`.
- Full verification passes with `./scripts/ops/verify-control-plane.sh`.
- Forbidden-term checks pass.

## Recommended Execution Order

Do not parallelize tasks that touch the same API contract. The safest order is exactly the task order above:

1. Tests for target surface
2. AccessToken storage
3. AccessToken routes
4. Runtime principal auth
5. Task targeting rename
6. Capability access policy rename
7. Feedback rename
8. Legacy model deletion
9. Tool alias deletion
10. Frontend tokens UI
11. Frontend task UI
12. Docs rewrite
13. Obsolete test cleanup
14. Final release cleanup

The most delicate tasks are Task 4, Task 5, Task 6, and Task 8. Run focused tests after each small change instead of waiting for the full suite.

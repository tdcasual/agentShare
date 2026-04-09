# Agent Control Plane Implementation Plan

## Historical Status

This file is retained as the initial MVP implementation plan. It contains early repository assumptions and should not be treated as the current architecture or repository-layout source of truth.

Read these guides first for the current product framing:

- `docs/guides/agent-server-first.md`
- `docs/guides/agent-quickstart.md`
- `docs/guides/production-deployment.md`

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MVP control plane where humans can store secrets through a web console, publish lightweight tasks, and let authenticated agents complete those tasks through proxy-first capabilities with optional short-lived secret leases.

**Architecture:** Use a thin application layer on top of a dedicated secret backend. A Next.js web console talks to a FastAPI control service backed by Postgres and Redis. The control service coordinates tasks, policies, and audit records, while a gateway module performs proxy invocations and lease issuance against OpenBao.

**Tech Stack:** Next.js, TypeScript, FastAPI, Python, Postgres, Redis, OpenBao, Docker Compose, Pytest, Playwright

---

## Preconditions

- This directory is not yet a git repository. Initialize one before implementation if you want branch isolation, worktrees, and commit checkpoints.
- Keep the first implementation single-workspace and local-development friendly.
- Default all capabilities to `proxy_only` until a lease use case is explicitly needed.

### Task 1: Initialize the Repository Skeleton

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `docker-compose.yml`
- Create: `apps/api/pyproject.toml`
- Create: `apps/api/app/__init__.py`
- Create: `apps/api/app/main.py`
- Create: `apps/api/tests/test_health.py`
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`

**Step 1: Write the failing API health test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_healthcheck_returns_ok():
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_health.py -v`
Expected: FAIL with import or route errors because the app is not wired yet.

**Step 3: Write the minimal implementation**

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_health.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md .gitignore docker-compose.yml apps/api apps/web
git commit -m "chore: scaffold control plane repository"
```

### Task 2: Add Shared Configuration and Persistence Wiring

**Files:**
- Create: `apps/api/app/config.py`
- Create: `apps/api/app/db.py`
- Create: `apps/api/app/models/base.py`
- Create: `apps/api/app/models/agent.py`
- Create: `apps/api/app/models/capability.py`
- Create: `apps/api/app/models/task.py`
- Create: `apps/api/app/models/run.py`
- Create: `apps/api/app/models/playbook.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_config.py`
- Create: `apps/api/tests/test_db_session.py`

**Step 1: Write the failing configuration test**

```python
from app.config import Settings


def test_settings_default_to_local_services():
    settings = Settings()

    assert settings.database_url.endswith("agent_share")
    assert settings.redis_url == "redis://localhost:6379/0"
    assert settings.secret_backend == "openbao"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_config.py -v`
Expected: FAIL because `Settings` does not exist.

**Step 3: Write the minimal implementation**

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/agent_share"
    redis_url: str = "redis://localhost:6379/0"
    secret_backend: str = "openbao"
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_config.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/config.py apps/api/app/db.py apps/api/app/models apps/api/tests
git commit -m "feat: add base configuration and persistence models"
```

### Task 3: Implement Agent Identity Authentication and Authorization Primitives

**Files:**
- Create: `apps/api/app/auth.py`
- Create: `apps/api/app/routes/agents.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_agent_auth.py`

**Step 1: Write the failing auth test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_agent_request_requires_bearer_token():
    client = TestClient(app)

    response = client.get("/api/agents/me")

    assert response.status_code == 401
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_agent_auth.py -v`
Expected: FAIL because the route or auth dependency does not exist.

**Step 3: Write the minimal implementation**

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)


def require_agent_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> str:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return credentials.credentials
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_agent_auth.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/auth.py apps/api/app/routes/agents.py apps/api/app/main.py apps/api/tests/test_agent_auth.py
git commit -m "feat: add agent auth primitives"
```

### Task 4: Build Secret and Capability Management APIs

**Files:**
- Create: `apps/api/app/schemas/secrets.py`
- Create: `apps/api/app/schemas/capabilities.py`
- Create: `apps/api/app/services/secret_backend.py`
- Create: `apps/api/app/services/capability_service.py`
- Create: `apps/api/app/routes/secrets.py`
- Create: `apps/api/app/routes/capabilities.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_secrets_api.py`
- Create: `apps/api/tests/test_capabilities_api.py`

**Step 1: Write the failing secret creation test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_create_secret_returns_reference_only():
    client = TestClient(app)

    response = client.post(
        "/api/secrets",
        json={
            "display_name": "OpenAI prod key",
            "kind": "api_token",
            "value": "sk-live-example",
            "scope": {"provider": "openai"},
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["display_name"] == "OpenAI prod key"
    assert "value" not in body
    assert body["backend_ref"].startswith("openbao:")
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_secrets_api.py -v`
Expected: FAIL because the route and backend adapter do not exist.

**Step 3: Write the minimal implementation**

```python
class SecretBackend:
    def write_secret(self, name: str, value: str) -> str:
        return f"openbao:{name}"
```

Implement the route so it persists only metadata and returns a redacted response.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_secrets_api.py tests/test_capabilities_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/schemas apps/api/app/services apps/api/app/routes apps/api/tests/test_secrets_api.py apps/api/tests/test_capabilities_api.py
git commit -m "feat: add secrets and capabilities APIs"
```

### Task 5: Implement Task Queue Creation, Claiming, and Completion

**Files:**
- Create: `apps/api/app/schemas/tasks.py`
- Create: `apps/api/app/services/task_service.py`
- Create: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_tasks_api.py`

**Step 1: Write the failing task claim test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_agent_can_claim_eligible_task():
    client = TestClient(app)

    created = client.post(
        "/api/tasks",
        json={
            "title": "Sync provider config",
            "task_type": "config_sync",
            "input": {"provider": "qq"},
            "required_capability_ids": ["qq.account.configure"],
            "lease_allowed": False,
        },
    )

    response = client.post(
        f"/api/tasks/{created.json()['id']}/claim",
        headers={"Authorization": "Bearer agent-test-token"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "claimed"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_tasks_api.py -v`
Expected: FAIL because the task service and route logic do not exist.

**Step 3: Write the minimal implementation**

```python
def claim_task(task: TaskRecord, agent_id: str) -> TaskRecord:
    if task.status != "pending":
        raise ValueError("Task is not claimable")
    task.status = "claimed"
    task.claimed_by = agent_id
    return task
```

Implement route handlers for create, list, claim, and complete with audit hooks.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_tasks_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/schemas/tasks.py apps/api/app/services/task_service.py apps/api/app/routes/tasks.py apps/api/app/main.py apps/api/tests/test_tasks_api.py
git commit -m "feat: add task lifecycle APIs"
```

### Task 6: Add Proxy Invocation and Lease Issuance

**Files:**
- Create: `apps/api/app/schemas/invoke.py`
- Create: `apps/api/app/services/gateway.py`
- Create: `apps/api/app/routes/invoke.py`
- Create: `apps/api/app/routes/leases.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_invoke_api.py`
- Create: `apps/api/tests/test_lease_api.py`

**Step 1: Write the failing lease policy test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_proxy_only_capability_cannot_issue_lease():
    client = TestClient(app)

    response = client.post(
        "/api/capabilities/openai.chat.invoke/lease",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"task_id": "task-123", "purpose": "local sdk call"},
    )

    assert response.status_code == 403
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_invoke_api.py tests/test_lease_api.py -v`
Expected: FAIL because the gateway and lease routes do not exist.

**Step 3: Write the minimal implementation**

```python
def issue_lease(capability: CapabilityRecord, agent_id: str, task_id: str) -> dict:
    if capability.allowed_mode == "proxy_only":
        raise PermissionError("Lease not allowed")
    return {"lease_id": "lease-123", "expires_in": capability.lease_ttl_seconds}
```

Implement proxy invocation routing and lease issuance with audit events.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_invoke_api.py tests/test_lease_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/schemas/invoke.py apps/api/app/services/gateway.py apps/api/app/routes/invoke.py apps/api/app/routes/leases.py apps/api/app/main.py apps/api/tests/test_invoke_api.py apps/api/tests/test_lease_api.py
git commit -m "feat: add proxy invocation and lease issuance"
```

### Task 7: Build the Web Console Shell and Core Pages

**Files:**
- Create: `apps/web/app/globals.css`
- Create: `apps/web/components/nav-shell.tsx`
- Create: `apps/web/components/secrets-form.tsx`
- Create: `apps/web/components/tasks-table.tsx`
- Create: `apps/web/components/runs-table.tsx`
- Create: `apps/web/lib/api.ts`
- Create: `apps/web/app/secrets/page.tsx`
- Create: `apps/web/app/capabilities/page.tsx`
- Create: `apps/web/app/tasks/page.tsx`
- Create: `apps/web/app/agents/page.tsx`
- Create: `apps/web/app/runs/page.tsx`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/tests/console.spec.ts`

**Step 1: Write the failing UI test**

```ts
import { test, expect } from "@playwright/test";

test("homepage links to secrets and tasks", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Secrets" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tasks" })).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx playwright test tests/console.spec.ts`
Expected: FAIL because the app shell and routes do not exist.

**Step 3: Write the minimal implementation**

```tsx
export default function HomePage() {
  return (
    <main>
      <a href="/secrets">Secrets</a>
      <a href="/tasks">Tasks</a>
    </main>
  );
}
```

Then add the page shell, basic data tables, and forms that call the API.

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx playwright test tests/console.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/app apps/web/components apps/web/lib apps/web/tests
git commit -m "feat: add web console shell"
```

### Task 8: Add Audit Logging and Run History

**Files:**
- Create: `apps/api/app/services/audit_service.py`
- Create: `apps/api/app/routes/runs.py`
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/routes/invoke.py`
- Modify: `apps/api/app/routes/leases.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_runs_api.py`

**Step 1: Write the failing audit test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_completed_task_creates_run_record():
    client = TestClient(app)

    response = client.get("/api/runs")

    assert response.status_code == 200
    assert isinstance(response.json()["items"], list)
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_runs_api.py -v`
Expected: FAIL because the run listing route and audit service do not exist.

**Step 3: Write the minimal implementation**

```python
def write_audit_event(event_type: str, payload: dict) -> None:
    pass
```

Implement run creation when tasks complete, capabilities invoke, or leases issue.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_runs_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/services/audit_service.py apps/api/app/routes/runs.py apps/api/app/routes/tasks.py apps/api/app/routes/invoke.py apps/api/app/routes/leases.py apps/api/app/main.py apps/api/tests/test_runs_api.py
git commit -m "feat: add audit logging and run history"
```

### Task 9: Add Playbook Storage and Retrieval

**Files:**
- Create: `apps/api/app/schemas/playbooks.py`
- Create: `apps/api/app/services/playbook_service.py`
- Create: `apps/api/app/routes/playbooks.py`
- Modify: `apps/api/app/main.py`
- Create: `apps/api/tests/test_playbooks_api.py`
- Create: `apps/web/app/playbooks/page.tsx`
- Modify: `apps/web/components/nav-shell.tsx`

**Step 1: Write the failing playbook test**

```python
from fastapi.testclient import TestClient

from app.main import app


def test_create_playbook_returns_saved_record():
    client = TestClient(app)

    response = client.post(
        "/api/playbooks",
        json={
            "title": "QQ config sync",
            "task_type": "config_sync",
            "body": "Validate capability, then invoke provider update, then confirm success.",
            "tags": ["qq", "config"],
        },
    )

    assert response.status_code == 201
    assert response.json()["title"] == "QQ config sync"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && pytest tests/test_playbooks_api.py -v`
Expected: FAIL because playbook storage and routes do not exist.

**Step 3: Write the minimal implementation**

```python
def create_playbook(payload: dict) -> dict:
    return {"id": "pb-123", **payload}
```

Add the API and a basic page to view and search playbooks.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && pytest tests/test_playbooks_api.py -v`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/app/schemas/playbooks.py apps/api/app/services/playbook_service.py apps/api/app/routes/playbooks.py apps/api/app/main.py apps/api/tests/test_playbooks_api.py apps/web/app/playbooks/page.tsx apps/web/components/nav-shell.tsx
git commit -m "feat: add playbook management"
```

### Task 10: Verify the End-to-End Baseline

**Files:**
- Modify: `README.md`
- Modify: `docker-compose.yml`
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/secret-to-task.spec.ts`

**Step 1: Write the failing end-to-end test**

```ts
import { test, expect } from "@playwright/test";

test("user can create a secret and publish a task", async ({ page }) => {
  await page.goto("/secrets");

  await page.getByLabel("Display name").fill("OpenAI prod key");
  await page.getByLabel("Kind").selectOption("api_token");
  await page.getByLabel("Value").fill("sk-live-example");
  await page.getByRole("button", { name: "Save secret" }).click();

  await page.goto("/tasks");
  await page.getByLabel("Title").fill("Sync provider config");
  await page.getByRole("button", { name: "Create task" }).click();

  await expect(page.getByText("Sync provider config")).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx playwright test tests/secret-to-task.spec.ts`
Expected: FAIL until the UI and API are connected through a running local stack.

**Step 3: Write the minimal implementation**

Bring up local dependencies, connect the web app to the API, and add enough form handling for the flow above to succeed.

**Step 4: Run test to verify it passes**

Run: `docker compose up -d`
Run: `cd apps/api && pytest -v`
Run: `cd apps/web && npx playwright test`
Expected: API tests pass and Playwright passes the end-to-end flow.

**Step 5: Commit**

```bash
git add README.md docker-compose.yml apps/web/playwright.config.ts apps/web/tests/secret-to-task.spec.ts
git commit -m "test: verify secret and task MVP flow"
```

## Notes for Execution

- Start with in-memory implementations behind service interfaces where useful, then swap in Postgres and OpenBao-backed adapters without changing route contracts.
- Keep every route response free of secret plaintext.
- Add JSON logging only after redaction rules are implemented.
- Do not build multi-step workflow orchestration before the single-task lifecycle is stable.

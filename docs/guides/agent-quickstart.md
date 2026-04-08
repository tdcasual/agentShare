# Agent Quickstart

This guide is for local development and day-to-day agent workflow discovery. For production deployment and operations, use `docs/guides/production-deployment.md` and `docs/guides/production-operations.md`.

This guide is the shortest path from "I have a management session" to "I can provision an OpenClaw agent runtime and complete a task safely".

## Preconditions

- API base URL available at `http://127.0.0.1:8000`
- A persisted management operator account for session login
- An OpenClaw runtime session key for task claim, invoke, and complete flows

## Route Policy At A Glance

- Public:
  - `GET /healthz`
  - `/docs` and `/openapi.json`
- OpenClaw session-authenticated runtime:
  - `GET /api/agents/me`
  - `GET /api/tasks`
  - `POST /api/tasks/{task_id}/claim`
  - `POST /api/tasks/{task_id}/complete`
  - `POST /api/openclaw/dream-runs`
  - `POST /api/openclaw/dream-runs/{run_id}/steps`
  - `POST /api/openclaw/dream-runs/{run_id}/stop`
  - `GET /api/openclaw/memory`
  - `POST /api/openclaw/memory`
  - `POST /api/capabilities/{capability_id}/invoke`
  - `POST /api/capabilities/{capability_id}/lease`
  - `POST /mcp`
- Management login:
  - `POST /api/session/login`
- Management-session protected:
  - Any management role:
    `GET /api/session/me`, `POST /api/session/logout`, `GET /api/capabilities`, `POST /api/tasks`, `GET /api/runs`, `POST /api/playbooks`, `GET /api/playbooks/search`, `GET /api/playbooks/{playbook_id}`
  - `operator+`:
    `GET /api/approvals`, `POST /api/approvals/{approval_id}/approve`, `POST /api/approvals/{approval_id}/reject`
  - `admin+`:
    `POST/GET /api/secrets`, `POST /api/capabilities`, `GET/POST /api/agents`, `GET/POST /api/openclaw/agents`, `GET /api/openclaw/sessions`
  - `owner`:
    `DELETE /api/agents/{agent_id}`, `DELETE /api/openclaw/agents/{agent_id}`

## 1. Start A Management Session

```bash
export ACP_BASE_URL=http://127.0.0.1:8000
export ACP_COOKIE_JAR="$(mktemp -t acp-management-cookie.XXXXXX)"
export ACP_ADMIN_EMAIL=owner@example.com
export ACP_ADMIN_PASSWORD=changeme-owner-password

curl -sS \
  -c "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ACP_ADMIN_EMAIL\",\"password\":\"$ACP_ADMIN_PASSWORD\"}" \
  "$ACP_BASE_URL/api/session/login"
```

Expected: `200 OK`, `status=authenticated`, a non-empty `session_id`, and a `management_session` cookie written into `ACP_COOKIE_JAR`.

That cookie is not the only source of truth. The API now persists each management session server-side, so logout or incident-driven revocation can invalidate the cookie before its TTL expires.

## 2. Create An OpenClaw Agent Workspace (Admin Management Path)

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"cli-agent",
    "workspace_root":"/srv/openclaw/cli-agent",
    "agent_dir":".openclaw/agents/cli-agent",
    "model":"gpt-5",
    "thinking_level":"balanced",
    "sandbox_mode":"workspace-write",
    "risk_tier":"medium",
    "allowed_capability_ids":[],
    "allowed_task_types":["prompt_run","account_read"]
  }' \
  "$ACP_BASE_URL/api/openclaw/agents"
```

Save the returned agent id as `OPENCLAW_AGENT_ID`.

## 3. Create A Runtime Session Key (Admin Management Path)

```bash
export OPENCLAW_AGENT_ID=replace-me
export ACP_SESSION_KEY=sess_cli_agent_primary

curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{
    \"session_key\":\"$ACP_SESSION_KEY\",
    \"display_name\":\"CLI Primary Session\",
    \"channel\":\"chat\",
    \"subject\":\"local quickstart\"
  }" \
  "$ACP_BASE_URL/api/openclaw/agents/$OPENCLAW_AGENT_ID/sessions"
```

## 4. Verify Agent Identity (Runtime Path)

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  "$ACP_BASE_URL/api/agents/me"
```

Expected: `200 OK`, with agent identity, session metadata, workspace hints, and allowlists.

## 5. Create One Secret And One Capability (Admin Management Path)

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name":"OpenAI prod key",
    "kind":"api_token",
    "value":"sk-live-example",
    "provider":"openai",
    "environment":"production",
    "provider_scopes":["responses.read","responses.write"],
    "resource_selector":"org:core",
    "metadata":{"owner":"platform"}
  }' \
  "$ACP_BASE_URL/api/secrets"
```

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"openai.chat.invoke",
    "secret_id":"secret-1",
    "risk_level":"medium",
    "allowed_mode":"proxy_or_lease",
    "approval_mode":"manual",
    "lease_ttl_seconds":120,
    "required_provider":"openai",
    "required_provider_scopes":["responses.read"],
    "allowed_environments":["production"]
  }' \
  "$ACP_BASE_URL/api/capabilities"
```

Replace `secret-1` with the secret id returned by the first call, and save the returned capability id as `CAPABILITY_ID`.

If you are binding a GitHub token instead, set:

- `required_provider` to `github`
- `adapter_type` to `github`
- `adapter_config` to a narrow REST path such as `{"method":"GET","path":"/repos/{owner}/{repo}/issues"}`

## 6. Publish One Task That Uses The Capability (Management Path)

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Manual approval smoke test",
    "task_type":"prompt_run",
    "input":{"provider":"openai"},
    "required_capability_ids":["capability-1"],
    "lease_allowed":false,
    "approval_mode":"auto"
  }' \
  "$ACP_BASE_URL/api/tasks"
```

Replace `capability-1` with your real capability id, then save the returned task id as `TASK_ID`.

This example keeps the task on `approval_mode="auto"` and makes the capability manual, which is enough to force a human approval at runtime. Setting the task to `manual` would create the same approval boundary.

## 7. Claim The Task (Runtime)

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -X POST \
  "$ACP_BASE_URL/api/tasks/$TASK_ID/claim"
```

Expected: `200 OK`, task moves to `claimed`, `claimed_by` is your agent.

## 8. Invoke Capability Or Request Lease (Runtime)

Proxy invoke:

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task-1","parameters":{"prompt":"hello"}}' \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/invoke"
```

Replace the literal `task-1` in the JSON examples with the task you claimed in step 6.

If the task or capability is manual, expect a `409 Conflict` body shaped like this:

```json
{
  "detail": {
    "code": "approval_required",
    "approval_request_id": "approval-123",
    "status": "pending",
    "action_type": "invoke"
  }
}
```

When you receive `409 approval_required`, stop retrying and wait for an operator decision. The gateway has not fetched the secret or contacted the upstream adapter yet.

Lease request (only when policy allows):

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task-1","purpose":"git cli access"}' \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/lease"
```

Current lease behavior: the response is an explicit metadata placeholder. It confirms the lease decision and expiry window, but does not return raw secret material or a derived session artifact.

## 9. Review And Approve The Pending Request (Operator+ Management Path)

List the current queue:

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  "$ACP_BASE_URL/api/approvals?status=pending"
```

Approve the request:

```bash
export APPROVAL_ID=approval-123

curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Approved for this task"}' \
  "$ACP_BASE_URL/api/approvals/$APPROVAL_ID/approve"
```

Replace `approval-123` with the request id returned by the pending-approvals list or the runtime `409` response body.

The same queue is available in the web console at `/approvals` after logging in through `/login`.

## 10. Retry The Same Runtime Action

After approval, retry the exact invoke or lease call. A successful approval converts the manual boundary into a temporary allow decision for that task, capability, and action type.

Successful invoke responses now include:

- `adapter_type`
- `upstream_status`
- `result`

Management sessions are intentionally short-lived. Every successful login mints a fresh `session_id`, and retries after expiry should start with a new `/api/session/login` exchange instead of assuming a stale cookie can be reused. The same is true after logout or explicit operator revocation: a previously issued cookie is expected to stop authorizing immediately.

Management routes may also enforce role boundaries. `operator` can review approvals, `admin` can manage secrets and agent inventory, and `owner` is required for destructive agent-management actions such as deletion.

That keeps adapter behavior explicit without leaking the secret or raw credential material.

## 11. Complete Task (Runtime)

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"result_summary":"Completed","output_payload":{"ok":true}}' \
  -X POST \
  "$ACP_BASE_URL/api/tasks/$TASK_ID/complete"
```

## 12. Optional: Start A Bounded Dream Run

Dream Mode is a bounded autonomy loop for OpenClaw runtimes. It is controlled by each agent's `dream_policy` and does not create a hidden background daemon.

Start a run:

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"objective":"Inspect config drift and suggest a follow-up task"}' \
  "$ACP_BASE_URL/api/openclaw/dream-runs"
```

Record one step:

```bash
export DREAM_RUN_ID=replace-me

curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "step_type":"plan",
    "status":"completed",
    "input_payload":{"prompt":"What should I do next?"},
    "output_payload":{"summary":"Search playbooks first"},
    "token_usage":{"input":12,"output":6}
  }' \
  "$ACP_BASE_URL/api/openclaw/dream-runs/$DREAM_RUN_ID/steps"
```

Write one explicit memory note:

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scope":"agent",
    "kind":"working_note",
    "importance":"medium",
    "tags":["config","drift"],
    "content":"Config drift usually starts in the staging overlay."
  }' \
  "$ACP_BASE_URL/api/openclaw/memory"
```

Dream Mode also appears in MCP as:

- `dream.runs.start`
- `dream.runs.record_step`
- `dream.runs.stop`
- `dream.memory.search`
- `dream.memory.write`
- `dream.tasks.propose_followup`

## Common Failure Codes

- `401`: Missing/invalid OpenClaw session key or missing/invalid management session cookie.
- `403`: Authenticated but outside policy scope (task type, capability allowlist, ownership, management route boundary, or lease restrictions).
- `404`: Referenced task/capability/secret not found.
- `409`: State conflict, usually task claim/completion races or `approval_required` for manual approval boundaries.
- `500`: Control-plane misconfiguration such as an unknown adapter type or invalid adapter config.
- `502`: Capability adapter or upstream runtime dependency failed; retry only after fixing the adapter/backend issue.

## Source Of Truth For Schema

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

Treat these two as authoritative for request and response schema details.

## MCP Alternative

When the agent should discover tools dynamically instead of issuing direct HTTP calls, switch to `docs/guides/mcp-quickstart.md`.

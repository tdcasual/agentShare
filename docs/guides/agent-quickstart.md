# Agent Quickstart

This guide is the shortest path from "I have an agent key" to "I can complete a task safely".

## Preconditions

- API base URL available at `http://127.0.0.1:8000`
- A valid runtime agent key for task claim, invoke, and complete flows
- A bootstrap management credential used only for session login (`BOOTSTRAP_AGENT_KEY`)

## Route Policy At A Glance

- Public:
  - `GET /healthz`
  - `/docs` and `/openapi.json`
- Agent-authenticated runtime:
  - `GET /api/agents/me`
  - `GET /api/tasks`
  - `POST /api/tasks/{task_id}/claim`
  - `POST /api/tasks/{task_id}/complete`
  - `POST /api/capabilities/{capability_id}/invoke`
  - `POST /api/capabilities/{capability_id}/lease`
  - `POST /mcp`
- Bootstrap login:
  - `POST /api/session/login`
- Management-session protected:
  - `GET /api/session/me`
  - `POST /api/session/logout`
  - `POST/GET /api/secrets`
  - `POST/GET /api/capabilities`
  - `POST /api/tasks`
  - `GET /api/approvals`
  - `POST /api/approvals/{approval_id}/approve`
  - `POST /api/approvals/{approval_id}/reject`
  - `GET/POST/DELETE /api/agents`
  - `GET /api/runs`
  - `POST /api/playbooks`, `GET /api/playbooks/search`

## 1. Start A Management Session

```bash
export ACP_BASE_URL=http://127.0.0.1:8000
export BOOTSTRAP_AGENT_KEY=changeme-bootstrap-key
export ACP_COOKIE_JAR="$(mktemp -t acp-management-cookie.XXXXXX)"

curl -sS \
  -c "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d "{\"bootstrap_key\":\"$BOOTSTRAP_AGENT_KEY\"}" \
  "$ACP_BASE_URL/api/session/login"
```

Expected: `200 OK`, `status=authenticated`, and a `management_session` cookie written into `ACP_COOKIE_JAR`.

## 2. Create A Runtime Agent Key (Management Path)

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{"name":"cli-agent","risk_tier":"medium","allowed_capability_ids":[],"allowed_task_types":["prompt_run","account_read"]}' \
  "$ACP_BASE_URL/api/agents"
```

Save the returned `api_key` as `ACP_AGENT_KEY`.

## 3. Verify Agent Identity (Runtime Path)

```bash
export ACP_AGENT_KEY=replace-me

curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  "$ACP_BASE_URL/api/agents/me"
```

Expected: `200 OK`, with agent identity and allowlists.

## 4. Create One Secret And One Capability (Management Path)

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

## 5. Publish One Task That Uses The Capability (Management Path)

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

## 6. Claim The Task (Runtime)

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  -X POST \
  "$ACP_BASE_URL/api/tasks/$TASK_ID/claim"
```

Expected: `200 OK`, task moves to `claimed`, `claimed_by` is your agent.

## 7. Invoke Capability Or Request Lease (Runtime)

Proxy invoke:

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
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
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task-1","purpose":"git cli access"}' \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/lease"
```

Current lease behavior: the response is an explicit metadata placeholder. It confirms the lease decision and expiry window, but does not return raw secret material or a derived session artifact.

## 8. Review And Approve The Pending Request (Management Path)

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

## 9. Retry The Same Runtime Action

After approval, retry the exact invoke or lease call. A successful approval converts the manual boundary into a temporary allow decision for that task, capability, and action type.

Successful invoke responses now include:

- `adapter_type`
- `upstream_status`
- `result`

That keeps adapter behavior explicit without leaking the secret or raw credential material.

## 10. Complete Task (Runtime)

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"result_summary":"Completed","output_payload":{"ok":true}}' \
  -X POST \
  "$ACP_BASE_URL/api/tasks/$TASK_ID/complete"
```

## Common Failure Codes

- `401`: Missing/invalid bearer token or missing/invalid management session cookie.
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

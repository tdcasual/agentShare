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
- Bootstrap login:
  - `POST /api/session/login`
- Management-session protected:
  - `GET /api/session/me`
  - `POST /api/session/logout`
  - `POST/GET /api/secrets`
  - `POST/GET /api/capabilities`
  - `POST /api/tasks`
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
    "lease_ttl_seconds":120,
    "required_provider":"openai",
    "required_provider_scopes":["responses.read"],
    "allowed_environments":["production"]
  }' \
  "$ACP_BASE_URL/api/capabilities"
```

## 5. List Tasks And Claim One (Runtime)

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  "$ACP_BASE_URL/api/tasks"
```

```bash
export TASK_ID=task-1

curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  -X POST \
  "$ACP_BASE_URL/api/tasks/$TASK_ID/claim"
```

Expected: `200 OK`, task moves to `claimed`, `claimed_by` is your agent.

## 6. Invoke Capability Or Request Lease (Runtime)

Proxy invoke:

```bash
export CAPABILITY_ID=capability-1

curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task-1","parameters":{"prompt":"hello"}}' \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/invoke"
```

Lease request (only when policy allows):

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"task_id":"task-1","purpose":"git cli access"}' \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/lease"
```

Current lease behavior: the response is an explicit metadata placeholder. It confirms the lease decision and expiry window, but does not return raw secret material or a derived session artifact.

## 7. Complete Task (Runtime)

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
- `409`: State conflict, usually task claim or completion race.
- `500`: Control-plane misconfiguration such as an unknown adapter type or invalid adapter config.
- `502`: Capability adapter or upstream runtime dependency failed; retry only after fixing the adapter/backend issue.

## Source Of Truth For Schema

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

Treat these two as authoritative for request and response schema details.

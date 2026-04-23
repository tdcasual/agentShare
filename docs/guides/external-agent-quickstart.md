# External Agent Quickstart

This guide is the shortest path from "I have an Access Token" to "I can discover, claim, execute, and complete assigned tasks on the Agent Control Plane." It covers both the HTTP REST path and the MCP (Model Context Protocol) path.

If you need architectural framing, read [Agent Server First](agent-server-first.md) first. For how a human admin mints Access Tokens, see [Admin Bootstrap And Access Token Ops](admin-bootstrap-and-access-token-ops.md).

**What this guide is not.** This guide does not cover management login, OpenClaw agent provisioning, or session key creation. It starts from an already-issued standalone Access Token. If you are an in-project OpenClaw agent, use the [Agent Quickstart](agent-quickstart.md) instead.

---

## Key Difference From The OpenClaw Path

The OpenClaw session-key path operates on **task IDs** directly. The Access Token path operates on **target IDs** — a target is a task assignment scoped to your specific token. This matters for claiming and completing tasks over HTTP REST:

| Action | OpenClaw path | Access Token path |
|--------|--------------|-------------------|
| Discover work | `GET /api/tasks` | `GET /api/tasks/assigned` |
| Claim | `POST /api/tasks/{task_id}/claim` | `POST /api/task-targets/{target_id}/claim` |
| Complete | `POST /api/tasks/{task_id}/complete` | `POST /api/task-targets/{target_id}/complete` |
| Invoke capability | same | same |
| Request lease | same | same |

When using MCP, this distinction is handled internally — you pass `task_id` to the MCP tools and the server resolves the correct target for your token.

---

## Preconditions

- An API base URL (e.g. `http://127.0.0.1:8000` or your deployed instance).
- A standalone Access Token (`api_key`) already minted by a human admin through `POST /api/access-tokens`. The token **must** have `scopes: ["runtime"]`.
- The token's `status` must be `active` (not revoked, not expired).
- At least one task has been published and targeted to your Access Token (via `target_mode: "explicit_access_tokens"` and `target_access_token_ids` containing your token id).

```bash
export ACP_BASE_URL=http://127.0.0.1:8000
export ACP_TOKEN=replace-with-your-access-token
```

---

## 1. Verify Your Identity

Confirm the token is valid and discover what identity the control plane sees.

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  "$ACP_BASE_URL/api/runtime/me"
```

Expected: `200 OK` with a JSON body. For Access Token principals the key fields are:

```json
{
  "actor_type": "access_token",
  "id": "ci-runner",
  "name": "CI build runner",
  "issuer": "automation",
  "auth_method": "access_token",
  "status": "active",
  "token_id": "access-token-abc123",
  "token_prefix": "access-tes",
  "subject_type": "automation",
  "subject_id": "ci-runner",
  "expires_at": null,
  "scopes": ["runtime"],
  "labels": {"env": "staging"},
  "allowed_capability_ids": [],
  "allowed_task_types": [],
  "risk_tier": "medium"
}
```

Verify that `auth_method` is `"access_token"`, `scopes` contains `"runtime"`, and `status` is `"active"`. If you get `401 {"detail": "Missing bearer token"}` the `Authorization` header is missing. If you get `403 {"detail": "Access token lacks runtime scope"}` the token was minted without runtime scope — ask the admin to reissue it.

---

## 2. Discover Assigned Tasks

List only the task targets explicitly assigned to your Access Token.

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  "$ACP_BASE_URL/api/tasks/assigned"
```

Expected: `200 OK` with an `items` array:

```json
{
  "items": [
    {
      "id": "target-xyz789",
      "task_id": "task-def456",
      "title": "Sync provider config",
      "task_type": "config_sync",
      "target_access_token_id": "access-token-abc123",
      "status": "pending",
      "claimed_by_access_token_id": null,
      "claimed_by_agent_id": null,
      "claimed_at": null,
      "completed_at": null,
      "last_run_id": null
    }
  ]
}
```

Save the `id` field (the **target ID**, not `task_id`) for the next step:

```bash
export TARGET_ID=target-xyz789
export TASK_ID=task-def456
```

The `task_id` field is the underlying task and is needed for capability invocation. The `id` field is your target assignment handle and is used for claim and complete.

---

## 3. Claim a Task Target

Atomically claim the assigned task target. No request body is needed.

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -X POST \
  "$ACP_BASE_URL/api/task-targets/$TARGET_ID/claim"
```

Expected: `200 OK`. The response `status` changes to `"claimed"`, and `claimed_by_access_token_id`, `claimed_by_agent_id`, and `claimed_at` are populated:

```json
{
  "id": "target-xyz789",
  "task_id": "task-def456",
  "title": "Sync provider config",
  "task_type": "config_sync",
  "target_access_token_id": "access-token-abc123",
  "status": "claimed",
  "claimed_by_access_token_id": "access-token-abc123",
  "claimed_by_agent_id": "ci-runner",
  "claimed_at": "2026-04-22T14:30:00Z",
  "completed_at": null,
  "last_run_id": null
}
```

If the target was already claimed by another process, expect `409 {"detail": "Task target is not claimable"}`.

---

## 4. Invoke a Capability

Call a capability through the proxy gateway. The gateway reads the secret from the backend, selects the adapter, executes the call, and returns the result — the secret value is never exposed to you.

You need the `task_id` (not the target ID) and the `capability_id` of a capability bound to the task:

```bash
export CAPABILITY_ID=capability-1

curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"task_id\":\"$TASK_ID\",\"parameters\":{\"prompt\":\"Summarize the latest commits\"}}" \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/invoke"
```

Expected on success (`200 OK`):

```json
{
  "status": "completed",
  "mode": "proxy",
  "task_id": "task-def456",
  "capability_id": "capability-1",
  "provider": "openai.chat-completions",
  "adapter_type": "openai",
  "upstream_status": 200,
  "result": {
    "choices": [{"message": {"content": "The latest commits include..."}}]
  }
}
```

The `result` field contains the raw response from the upstream API. Its structure depends on the adapter type (`openai`, `github`, or `generic_http`).

---

## 5. Handle Approval Required

When the capability's policy rules require manual review, the invoke returns `409 Conflict` instead of executing:

```json
{
  "detail": "Capability invocation requires manual approval",
  "code": "approval_required",
  "approval_request_id": "approval-abc123",
  "status": "pending"
}
```

**What to do:**

1. Do **not** retry the invoke immediately.
2. Wait for a human operator to approve the request through the management console (`POST /api/approvals/{approval_id}/approve`).
3. Once approved, retry the exact same invoke call.

**Other error codes from the gateway:**

- `403 {"detail": "..."}` with `code: "policy_denied"` — the policy engine outright rejects this action. No amount of retrying will help. Check the capability's `approval_rules` or contact the admin.
- `502 {"detail": "Capability adapter '...' failed during proxy execution"}` — the upstream API (OpenAI, GitHub, etc.) returned an error or was unreachable. Retry after the upstream issue is resolved.

---

## 6. Complete the Task Target

Submit the task result. This marks the target as completed and creates a run record.

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"result_summary":"Config synced successfully","output_payload":{"files_updated":3,"errors":[]}}' \
  -X POST \
  "$ACP_BASE_URL/api/task-targets/$TARGET_ID/complete"
```

Expected: `200 OK`. The `status` becomes `"completed"`, `completed_at` is set, and `last_run_id` references the persisted run record:

```json
{
  "id": "target-xyz789",
  "task_id": "task-def456",
  "title": "Sync provider config",
  "task_type": "config_sync",
  "target_access_token_id": "access-token-abc123",
  "status": "completed",
  "claimed_by_access_token_id": "access-token-abc123",
  "claimed_by_agent_id": "ci-runner",
  "claimed_at": "2026-04-22T14:30:00Z",
  "completed_at": "2026-04-22T14:32:00Z",
  "last_run_id": "run-ghi012"
}
```

The `result_summary` is a human-readable description. The `output_payload` is a structured result that can be any JSON object. Both are stored in the run record for later review.

---

## 7. Optional — Request a Lease

When proxy mode is insufficient and you need direct secret access (e.g. for a CLI tool), request a short-lived capability lease instead.

**Note:** The task must have `lease_allowed: true` and the capability must have `allowed_mode` other than `"proxy_only"`, or the server returns `403`.

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"task_id\":\"$TASK_ID\",\"purpose\":\"Git CLI access for repository sync\"}" \
  "$ACP_BASE_URL/api/capabilities/$CAPABILITY_ID/lease"
```

Expected: `201 Created`:

```json
{
  "lease_id": "lease-task-def456-capability-1",
  "capability_id": "capability-1",
  "task_id": "task-def456",
  "issued_to": "ci-runner",
  "purpose": "Git CLI access for repository sync",
  "expires_in": 120,
  "lease_type": "metadata_placeholder",
  "secret_value_included": false,
  "secret_ref": "backend://openbao/secret/data/agent-share/..."
}
```

Current lease responses are metadata placeholders. The `secret_value_included` is always `false` — the raw secret is not returned. Use the `secret_ref` for auditing purposes.

---

## MCP Alternative

The MCP endpoint (`POST /mcp`) provides the same functionality through JSON-RPC 2.0 tool calls. Use your Access Token as the Bearer credential — the MCP server does not distinguish between session keys and access tokens.

For deeper MCP coverage, see the [MCP Quickstart](mcp-quickstart.md).

### Initialize

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  "$ACP_BASE_URL/mcp"
```

Expected: `200 OK` with `serverInfo.name: "agent-control-plane-mcp"` and a `tools` capability block.

### Discover Available Tools

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  "$ACP_BASE_URL/mcp"
```

Expected: an array of tool definitions, each with `name`, `description`, and `inputSchema`. The core tools for task execution are `tasks.list`, `tasks.claim`, `tasks.complete`, `capabilities.invoke`, and `capabilities.request_lease`.

### List Tasks

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"tasks.list","arguments":{}}}' \
  "$ACP_BASE_URL/mcp"
```

Expected: `result.isError: false` and `result.structuredContent.items` with available tasks. For access token principals, this internally returns only tasks targeted to your token.

### Claim a Task

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"tasks.claim\",\"arguments\":{\"task_id\":\"$TASK_ID\"}}}" \
  "$ACP_BASE_URL/mcp"
```

Note: pass the **task ID** (not target ID) to MCP tools. The server internally resolves the correct target for access token principals.

Expected: `result.isError: false` and `result.structuredContent` with the claimed task or target.

### Invoke a Capability

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",\"params\":{\"name\":\"capabilities.invoke\",\"arguments\":{\"capability_id\":\"$CAPABILITY_ID\",\"task_id\":\"$TASK_ID\",\"parameters\":{\"prompt\":\"Summarize commits\"}}}}" \
  "$ACP_BASE_URL/mcp"
```

Expected on success: `result.isError: false` with `result.structuredContent` containing the proxy response (same shape as the HTTP invoke).

On policy block: `result.isError: true` with `result.structuredContent.status_code: 409` for approval required, or `403` for policy denied.

### Complete the Task

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":6,\"method\":\"tools/call\",\"params\":{\"name\":\"tasks.complete\",\"arguments\":{\"task_id\":\"$TASK_ID\",\"result_summary\":\"Config synced successfully\",\"output_payload\":{\"files_updated\":3}}}}" \
  "$ACP_BASE_URL/mcp"
```

Expected: `result.isError: false` with the completed task or target in `result.structuredContent`.

---

## Common Failure Codes

| Code | Meaning | Access Token specifics |
|------|---------|----------------------|
| `401` | Missing or invalid token | Verify `$ACP_TOKEN` matches the `api_key` returned when the admin created the token. Check that the token has not expired (`expires_at`) or been revoked. |
| `403` | Authenticated but outside policy scope | Common causes: token lacks `runtime` scope, capability not allowed for this token, task type not allowed, policy outright denies the action, or task does not allow leases. |
| `404` | Referenced resource not found | Verify `target_id`, `task_id`, or `capability_id` is correct and exists. |
| `409` | State conflict or approval required | The target was already claimed, is not in a claimable state, or the capability requires manual approval (`approval_required`). |
| `422` | Malformed request body | Missing required fields (e.g. `task_id` in invoke payload, `result_summary` in complete). |
| `500` | Control plane misconfiguration | Unknown adapter type or misconfigured capability binding. Contact the admin. |
| `502` | Upstream adapter failure | The external API (OpenAI, GitHub, etc.) returned an error or was unreachable. Retry after the upstream issue resolves. |

---

## Polling and Retry Guidance

**409 with `approval_required`:** Do not retry the invoke immediately. An operator must approve the request through the management console. Poll at 10–30 second intervals by re-calling `GET /api/tasks/assigned` to check if the task target status has changed, or retry the invoke after giving the operator time to act.

**409 with claim/complete races:** These are transient (distributed lock contention). Retry after a short backoff (1–3 seconds).

**502 upstream failures:** Retry with exponential backoff (start at 5 seconds, double each retry, cap at 60 seconds). Only retry if the underlying upstream service is expected to recover.

**Token expiry:** If your token has `expires_at` set, check it before each call. A `401` after previously successful calls likely means the token has expired or been revoked — contact the admin who issued it.

**Polling cadence:** The control plane does not currently enforce rate limits on runtime endpoints, but external agents should avoid tight polling loops. Prefer event-driven patterns or poll at 30+ second intervals.

---

## Source Of Truth

- **Swagger UI:** `$ACP_BASE_URL/docs`
- **OpenAPI JSON:** `$ACP_BASE_URL/openapi.json`
- **MCP tool list:** `POST $ACP_BASE_URL/mcp` with method `tools/list`

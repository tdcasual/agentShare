# MCP Quickstart

This guide is the shortest path from "I have a runtime bearer credential" to "I can call the control plane through MCP".

The preferred runtime bearer is an OpenClaw-style `session_key`. Remote managed tokens remain valid for external runtimes, but MCP should be understood as part of the agent server surface, not as a token product by itself. For the architecture framing, read `docs/guides/agent-server-first.md`. For the full external agent workflow including MCP with Access Tokens, see `docs/guides/external-agent-quickstart.md`.

## Preconditions

- API base URL available at `http://127.0.0.1:8000`
- A valid runtime bearer stored in `ACP_RUNTIME_BEARER`
  - for in-project OpenClaw runtimes, use a `session_key`
  - for external or off-project runtimes, use a managed remote-access token
- At least one published task in the queue

## Endpoint And Auth

- MCP endpoint: `POST /mcp`
- Auth model: reuse the same bearer credential already used for runtime HTTP routes
- Transport: JSON-RPC 2.0 request body with MCP-style `initialize`, `tools/list`, and `tools/call`

## 1. Initialize The MCP Session

```bash
export ACP_BASE_URL=http://127.0.0.1:8000
export ACP_RUNTIME_BEARER=replace-me

curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' \
  "$ACP_BASE_URL/mcp"
```

Expected: `200 OK` with `serverInfo.name="agent-control-plane-mcp"` and a `tools` capability block.

## 2. List Available Tools

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  "$ACP_BASE_URL/mcp"
```

Expected tools:

- `list_tasks`
- `claim_task`
- `complete_task`
- `search_playbooks`
- `invoke_capability`
- `request_capability_lease`

## 3. Make One Successful Tool Call

List tasks:

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_tasks","arguments":{}}}' \
  "$ACP_BASE_URL/mcp"
```

Expected: `result.isError=false` and `result.structuredContent.items` containing the visible task queue.

Claim a task:

```bash
export TASK_ID=task-1

curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"claim_task\",\"arguments\":{\"task_id\":\"$TASK_ID\"}}}" \
  "$ACP_BASE_URL/mcp"
```

Expected: `result.isError=false` and `result.structuredContent.status="claimed"`.

## 4. Search Playbooks Through MCP

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"search_playbooks","arguments":{"task_type":"prompt_run","q":"prompt","tag":"openai"}}}' \
  "$ACP_BASE_URL/mcp"
```

Expected: `result.isError=false`, plus `items` and `meta` fields that match the playbook search contract.

## 5. Observe A Policy-Blocked Tool Call

When runtime policy requires manual approval, MCP preserves the same semantics instead of inventing a second error model.

```bash
export CAPABILITY_ID=capability-1

curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":6,\"method\":\"tools/call\",\"params\":{\"name\":\"invoke_capability\",\"arguments\":{\"capability_id\":\"$CAPABILITY_ID\",\"task_id\":\"$TASK_ID\",\"parameters\":{\"prompt\":\"hello\"}}}}" \
  "$ACP_BASE_URL/mcp"
```

If policy blocks the invoke, expect:

- `result.isError=true`
- `result.structuredContent.status_code=409`
- `result.structuredContent.detail.code="approval_required"`

If policy denies the invoke outright, expect:

- `result.isError=true`
- `result.structuredContent.status_code=403`
- `result.structuredContent.detail.code="policy_denied"`

## 6. Complete The Task Through MCP

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_RUNTIME_BEARER" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":7,\"method\":\"tools/call\",\"params\":{\"name\":\"complete_task\",\"arguments\":{\"task_id\":\"$TASK_ID\",\"result_summary\":\"Completed through MCP\",\"output_payload\":{\"ok\":true}}}}" \
  "$ACP_BASE_URL/mcp"
```

Expected: `result.isError=false` and `result.structuredContent.status="completed"`.

## Common MCP Error Mapping

- `401`: missing or invalid runtime bearer before MCP dispatch starts
- `403`: outside task, capability, ownership, or policy boundary
- `404`: unknown task, capability, or tool name
- `409`: task conflict or `approval_required`
- `422`: malformed MCP tool arguments
- `500`: adapter misconfiguration
- `502`: upstream adapter or secret backend failure

## Source Of Truth

- MCP tool list: `tools/list`
- HTTP schema source of truth: `http://127.0.0.1:8000/docs` and `http://127.0.0.1:8000/openapi.json`

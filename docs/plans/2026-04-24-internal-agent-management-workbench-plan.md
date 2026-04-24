# Internal Agent Management And Workbench Plan

## Goal

Turn the existing `/identities` surface into a complete internal-agent management center, while introducing a separate agent workbench interaction model for operator-to-agent chat and runtime inspection.

## Product Split

- `Identities` remains the management and governance surface.
- `Agent Workbench` becomes the interaction surface for talking to one internal agent.

## Why This Split

- The current identities page already owns agent inventory, sessions, dream runs, files, and events.
- Mixing key management, runtime governance, and operator chat in one page would create a fragile and overcrowded control surface.
- A dedicated workbench lets us evolve message history, streaming, tool traces, and memory without turning `/identities` into a monolith.

## Backend Scope

### 1. Complete Internal Agent Management

- Keep existing OpenClaw agent CRUD as the base.
- Add OpenClaw session delete/revoke support so operators can retire compromised or stale session keys.
- Keep workspace file upsert/list management in place.
- Preserve dream run pause/resume and runtime visibility.

### 2. Add Agent Workbench Backend

- Introduce management-authenticated workbench conversation resources for one internal agent.
- Add persisted workbench conversation sessions.
- Add persisted workbench messages with `user`, `assistant`, and `system` roles.
- Let an operator choose an active capability-backed chat channel when opening a conversation.
- Generate assistant replies through an active OpenAI-style capability binding instead of inventing a second model configuration system.

### 3. Workbench Execution Rules

- Only management users may create or read workbench conversations.
- Workbench conversations target `OpenClawAgent` records, not standalone access tokens.
- A workbench conversation must reference an active capability whose adapter can serve chat-style responses.
- Initial implementation supports `adapter_type="openai"` only.
- System prompt composition should include agent identity plus any stored workspace bootstrap files such as `AGENTS.md`.

### 4. Out Of Scope For This Pass

- Browser-streamed token-by-token responses
- Operator impersonation of an existing runtime session
- Full MCP transcript playback
- Multi-user shared live chat editing
- Skill/tool policy enforcement beyond what already exists in backend policy checks

## Frontend Scope

### 1. Identities Page Upgrades

- Add create-agent flow
- Add edit-agent flow
- Add session management module
- Add workspace file editor
- Improve dream policy editing and run inspection
- Keep delete-agent flow

### 2. New Agent Detail / Workbench Route

- Add a dedicated route for one internal agent, linked from `/identities`
- Sections:
  - Overview
  - Sessions
  - Workspace
  - Dream
  - Events
  - Workbench

### 3. Workbench UI

- Conversation list in a left rail
- Active chat thread in the main pane
- Capability selector / channel metadata in the header
- Message composer in the footer
- Side panel for recent runtime context, files, and dream status

## API Checklist

### Existing APIs To Reuse

- `GET /api/openclaw/agents`
- `GET /api/openclaw/agents/{agent_id}`
- `POST /api/openclaw/agents`
- `PATCH /api/openclaw/agents/{agent_id}`
- `DELETE /api/openclaw/agents/{agent_id}`
- `POST /api/openclaw/agents/{agent_id}/sessions`
- `GET /api/openclaw/agents/{agent_id}/sessions`
- `GET /api/openclaw/sessions`
- `GET /api/openclaw/agents/{agent_id}/files`
- `PUT /api/openclaw/agents/{agent_id}/files/{file_name}`
- `GET /api/openclaw/dream-runs`
- `GET /api/openclaw/dream-runs/{run_id}`
- `POST /api/openclaw/dream-runs/{run_id}/pause`
- `POST /api/openclaw/dream-runs/{run_id}/resume`

### New Backend APIs To Add

- `POST /api/openclaw/sessions/{session_id}/revoke`
- `GET /api/openclaw/agents/{agent_id}/workbench/sessions`
- `POST /api/openclaw/agents/{agent_id}/workbench/sessions`
- `GET /api/openclaw/workbench/sessions/{conversation_id}`
- `GET /api/openclaw/workbench/sessions/{conversation_id}/messages`
- `POST /api/openclaw/workbench/sessions/{conversation_id}/messages`

## Data Model Checklist

- `openclaw_workbench_sessions`
- `openclaw_workbench_messages`

## Verification Checklist

- Backend tests for session revoke
- Backend tests for workbench conversation create/list/read/send
- Authorization tests for admin-only workbench access
- Capability validation tests for non-OpenAI or inactive capability rejection
- Frontend tests for identities management flows
- Frontend tests for agent workbench navigation and message rendering

## Recommended Execution Order

1. Add backend workbench storage and routes
2. Add backend session revoke
3. Verify backend tests
4. Hand frontend management + workbench implementation to Kimi CLI
5. Reconcile frontend/backend contracts
6. Run final verification across API and frontend

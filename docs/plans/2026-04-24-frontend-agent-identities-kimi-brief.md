# Frontend Brief For Kimi CLI

Implement the frontend half of the internal-agent management and workbench upgrade in `apps/control-plane-v3`.

## Constraints

- Do not change backend routes or payload shapes unless a missing contract blocks progress; if blocked, document the gap instead of inventing a different API.
- Preserve current route guards and role behavior.
- Prefer extending the current `/identities` page and `domains/identity` APIs instead of inventing a parallel domain.
- Avoid adding new dependencies unless absolutely necessary.

## Required UX Outcomes

- `/identities` becomes a complete internal-agent management page.
- Operators can create, edit, inspect, and delete internal agents from the management UI.
- Operators can manage sessions and workspace files from the same management surface.
- Each agent can open a dedicated workbench route for direct interaction.

## Required Frontend Changes

### Identities Page

- Add a create-agent action and modal or drawer.
- Add an edit-agent action for existing agents.
- Add a session management block:
  - list sessions
  - create session
  - revoke session
- Upgrade workspace files from read-only snapshots to editable management controls.
- Keep dream run inspection, pause, and resume.

### Agent Detail / Workbench

- Create a route for one internal agent, linked from `/identities`.
- Add tabs or a segmented layout:
  - Overview
  - Sessions
  - Workspace
  - Dream
  - Events
  - Workbench

### Workbench

- Left rail for conversation history
- Main panel for messages
- Header with agent identity and selected capability / channel
- Composer for sending messages
- Empty, loading, and error states that feel operational rather than toy-like

## Expected APIs

- Existing OpenClaw agent APIs from `src/domains/identity/api.ts`
- New backend APIs:
  - `POST /api/openclaw/sessions/{session_id}/revoke`
  - `GET /api/openclaw/agents/{agent_id}/workbench/sessions`
  - `POST /api/openclaw/agents/{agent_id}/workbench/sessions`
  - `GET /api/openclaw/workbench/sessions/{conversation_id}`
  - `GET /api/openclaw/workbench/sessions/{conversation_id}/messages`
  - `POST /api/openclaw/workbench/sessions/{conversation_id}/messages`

## Quality Bar

- Reuse the existing design system and management-shell patterns.
- Do not hide core agent actions behind ambiguous labels.
- Favor clear operational language over cute copy.
- Keep mobile and tablet navigation intact.

## Verification

- Run frontend tests related to identities and any new route tests.
- Run a production build for `apps/control-plane-v3`.
- Summarize changed files and any backend dependency assumptions.

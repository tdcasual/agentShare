# Admin Bootstrap And Token Operations

This guide describes the management access model introduced for the control plane:

- the bootstrap credential is single-use and only for first-run owner creation;
- public registration closes immediately after bootstrap;
- daily human management uses persisted email/password accounts and short-lived session cookies;
- runtime agents authenticate with managed tokens that can be minted, revoked, targeted, reviewed, and scored.

## Access Model

There are now two distinct operator entrypoints:

- Human management accounts:
  - first owner is created once with `POST /api/bootstrap/setup-owner`
  - later admins are invited with `POST /api/admin-accounts`
  - humans log in through `POST /api/session/login`
- Agent runtime tokens:
  - agents are created with `POST /api/agents`
  - each agent can have one or more managed tokens under `POST /api/agents/{agent_id}/tokens`
  - runtime task execution continues to use `Authorization: Bearer <token>`

After bootstrap finishes, no public self-registration path remains.

## First-Run Owner Bootstrap

Check whether bootstrap is still open:

```bash
curl http://127.0.0.1:8000/api/bootstrap/status
```

Create the founding owner account:

```bash
curl -X POST http://127.0.0.1:8000/api/bootstrap/setup-owner \
  -H 'Content-Type: application/json' \
  -d '{
    "bootstrap_key": "changeme-bootstrap-key",
    "email": "owner@example.com",
    "display_name": "Founding Owner",
    "password": "correct horse battery staple"
  }'
```

Expected behavior:

- the first request returns `201 Created`;
- `GET /api/bootstrap/status` flips to `{"initialized": true}`;
- repeating setup returns `409 Conflict`.

## Daily Human Management Login

Once bootstrap is complete, humans use email/password instead of the bootstrap credential:

```bash
curl -i -X POST http://127.0.0.1:8000/api/session/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "owner@example.com",
    "password": "correct horse battery staple"
  }'
```

The response sets a `management_session` cookie. Reuse that cookie for management routes:

- `GET /api/session/me`
- `POST /api/session/logout`
- `GET /api/admin-accounts`
- `POST /api/admin-accounts`
- `GET /api/agents`
- `POST /api/agents`
- `GET /api/reviews`

New human accounts are invite-only:

- owner bootstrap creates the first `owner`;
- later admins, operators, and viewers are created through `POST /api/admin-accounts`;
- public sign-up stays disabled.

## Managed Agent Tokens

Creating an agent also creates its primary runtime token:

```bash
curl -X POST http://127.0.0.1:8000/api/agents \
  -H 'Content-Type: application/json' \
  -H 'Cookie: management_session=...' \
  -d '{
    "name": "deploy-bot",
    "risk_tier": "medium",
    "allowed_task_types": ["config_sync", "account_read"]
  }'
```

The response includes:

- `id`
- `name`
- `api_key` for the newly minted primary token
- `token_id`
- `token_prefix`

Mint additional managed tokens per agent:

- `GET /api/agents/{agent_id}/tokens`
- `POST /api/agents/{agent_id}/tokens`
- `POST /api/agent-tokens/{token_id}/revoke`

Token records now keep operational aggregates:

- `completed_runs`
- `successful_runs`
- `success_rate`
- `last_feedback_at`
- `trust_score`

## Review Queue For Agent-Published Assets

Human-created governed assets become active immediately.

Agent-created governed assets stay in `pending_review` until a human approves or rejects them:

- `GET /api/reviews`
- `POST /api/reviews/{resource_kind}/{resource_id}/approve`
- `POST /api/reviews/{resource_kind}/{resource_id}/reject`

This applies to:

- secrets
- capabilities
- playbooks
- tasks

Each review item keeps provenance fields such as:

- `created_by_actor_type`
- `created_by_actor_id`
- `created_via_token_id`
- `reviewed_by_actor_id`
- `reviewed_at`

## Token-Targeted Tasks And Feedback

Tasks can now target runtime tokens explicitly:

```bash
curl -X POST http://127.0.0.1:8000/api/tasks \
  -H 'Content-Type: application/json' \
  -H 'Cookie: management_session=...' \
  -d '{
    "title": "Sync provider config",
    "task_type": "config_sync",
    "target_mode": "explicit_tokens",
    "target_token_ids": ["token-123"]
  }'
```

Relevant routes:

- `GET /api/tasks`
- `GET /api/tasks/assigned`
- `POST /api/task-targets/{target_id}/claim`
- `POST /api/task-targets/{target_id}/complete`
- `GET /api/runs`

Recorded run data now links executions back to both the runtime token and the concrete task target:

- `token_id`
- `task_target_id`

Human operators can leave feedback on completed task targets:

- `POST /api/task-targets/{task_target_id}/feedback`
- `GET /api/agent-tokens/{token_id}/feedback`

Feedback records then roll up into token-level trust metrics.

## Recommended Local Verification

After changing the bootstrap/token workflow, run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests -q
cd apps/control-plane-v3 && npm run typecheck
cd apps/control-plane-v3 && npm run build
```

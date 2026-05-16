# Current Architecture Authority

This document is the single source of truth for where the canonical definitions of this project live.

> **Rule:** If a guide contradicts this page, this page wins. If this page is silent, the linked canonical document wins. Everything else is historical context.

---

## Architecture

| Topic | Canonical Location | Status |
|-------|-------------------|--------|
| Application baseline and design philosophy | [`docs/guides/agent-server-first.md`](agent-server-first.md) | Current |
| Human operator quickstart | [`docs/guides/agent-quickstart.md`](agent-quickstart.md) | Current |
| External agent integration | [`docs/guides/external-agent-quickstart.md`](external-agent-quickstart.md) | Current |
| Admin bootstrap and access-token operations | [`docs/guides/admin-bootstrap-and-access-token-ops.md`](admin-bootstrap-and-access-token-ops.md) | Current |

## API Contracts

| Topic | Canonical Location | Status |
|-------|-------------------|--------|
| API interface summary | [`API_INTERFACES.md`](../../API_INTERFACES.md) | Current |
| OpenAPI schema | Generated at runtime from `apps/api/app/routes/__init__.py` | Current |
| Frontend/backend form catalog | `apps/api/app/services/intake_catalog.py` generates `apps/control-plane-v3/src/lib/forms/generated/intake-catalog.json` | Current |

## Deployment

| Topic | Canonical Location | Status |
|-------|-------------------|--------|
| Local development | Root [`docker-compose.yml`](../../docker-compose.yml) + [`README.md`](../../README.md) | Current |
| Production single-host | [`docker-compose.prod.yml`](../../docker-compose.prod.yml) + [`docs/guides/deployment-manual.md`](deployment-manual.md) | Current |
| Coolify / self-host | [`docker-compose.coolify.yml`](../../docker-compose.coolify.yml) + [`docs/guides/coolify-deployment.md`](coolify-deployment.md) | Current |

## Observability and Operations

| Topic | Canonical Location | Status |
|-------|-------------------|--------|
| Observability baseline | [`docs/guides/observability-baseline.md`](observability-baseline.md) | Current |
| Incident response | [`docs/guides/incident-response-playbook.md`](incident-response-playbook.md) | Current |

## Historical / Archival

| Location | What it contains |
|----------|-----------------|
| [`docs/plans/`](../plans/) | Execution plans, design snapshots, and historical change context. Not the primary source of truth unless explicitly linked from a current guide. |
| `docs/plans/README.md` | Index of older plans with guidance on which are historical vs. current. |

## How to update this page

1. When you create a new canonical guide, add it here.
2. When you move or replace a canonical guide, update the link here and redirect the old guide to the new one.
3. When you archive a plan, make sure `docs/plans/README.md` marks it as historical.

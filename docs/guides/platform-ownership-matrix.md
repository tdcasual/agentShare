# Platform Ownership Matrix

This matrix separates repository-owned application responsibilities from platform-owned enterprise responsibilities.

| Area | Repository-owned | Platform-owned |
| --- | --- | --- |
| Application services | Ship `api` and `web` code, images, schema migrations, smoke checks, and operator runbooks | Provide the runtime environment, host policy, and deployment guardrails |
| Operator identity | Local credential flow, session issuance, audit references, and the seam for future identity providers | SSO provider, lifecycle ownership, onboarding/offboarding policy, and emergency access governance |
| Postgres | Application schema, migrations, query behavior, and backup helper scripts | Managed Postgres provisioning, backup enforcement, restore validation, capacity, patching, and failover |
| Redis | Runtime coordination semantics, cache usage, and Redis backup helper scripts | Managed Redis provisioning, persistence policy, recovery validation, capacity, patching, and failover |
| Secret backend | Client integration, least-privilege token usage, and secret consumption paths | External secret backend lifecycle, backup policy, token issuance, token rotation, and recovery ownership |
| Ingress | Caddy baseline for the repository-owned single-host stack | Shared ingress, DNS, TLS policy, load balancing, HA failover, and edge-level resilience |
| Observability | Health endpoints, metrics emission, smoke checks, and request-log correlation | Centralized alerting, aggregated logs, dashboards, paging policy, and incident escalation |
| Security operations | App-level secret handling, cookie policy, and repository security guidance | Host hardening, network policy, vulnerability management, SSO enforcement, and enterprise incident response |

## Boundary Summary

- `repository-owned` means the application team can deliver and verify the behavior from inside this repository.
- `platform-owned` means long-lived infrastructure or cross-service operational policy that must be carried by a platform team.
- The single-host stack is a repository-owned baseline for controlled environments, not the final enterprise topology.
- The application team should not claim ownership of managed Postgres, managed Redis, secret backend operations, centralized alerting, or failover once the environment moves past trial use.

## Minimum Owner Roles For P3

Every P3 milestone must name at least these owner roles before execution starts:

- `Application Owner`: owns application behavior, rollout validation, smoke checks, and repo-side runbooks
- `Platform Owner`: owns runtime environment, managed dependency lifecycle, failover, and platform-operated alerts
- `Security Owner`: owns identity policy, break-glass governance, secret-access review expectations, and incident participation for security-impacting changes

One person may temporarily hold more than one role in a very small team, but the role names must still be recorded explicitly in milestone review notes.

## Approval Authority

The application team may approve:

- app code releases
- schema-compatible app changes
- repository-owned runbook updates
- smoke-test and verification changes

The application team must not approve alone:

- managed Postgres cutover
- managed Redis cutover
- secret backend lifecycle changes
- SSO rollout
- ingress or HA topology changes
- alert-routing changes that affect platform paging

Those changes require platform owner sign-off, and security owner sign-off where identity, secrets, or break-glass access are affected.

## Escalation Expectations

- Repository-owned failures begin with the application owner.
- Managed dependency and runtime failures begin with the platform owner.
- Identity, secret misuse, or suspected compromise must involve the security owner immediately.
- Cross-boundary incidents must follow the shared escalation flow in `docs/guides/platform-incident-escalation.md`.

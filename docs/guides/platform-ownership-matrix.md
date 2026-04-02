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

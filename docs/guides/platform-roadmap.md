# Platform Roadmap

This guide captures the remaining platform work that is intentionally outside the current single-host repository baseline.

## Target P3 End State

- Multi-host or managed high-availability topology instead of a single Docker host
- Managed or independently operated Postgres, Redis, and secret backend services
- Operator identity beyond bootstrap credentials, ideally SSO or an enterprise identity provider
- Automated secret rotation procedures with redeploy hooks and audit checkpoints

## Recommended Migration Order

1. Move Postgres to a managed or replicated service with automated backups.
2. Move Redis to a managed service or replicated deployment with persistence guarantees.
3. Move the external secret backend to a hardened, separately operated service with scoped tokens and documented rotation.
4. Introduce centralized logs, alerts, and dashboards that aggregate all production nodes.
5. Replace the bootstrap-only human access path with SSO or a dedicated operator identity provider.
6. Split the current single-host compose deployment into a multi-host or orchestrated runtime.

## What Stays In This Repository

- Application code
- Docker image build and publish pipeline
- Single-host production baseline for controlled environments
- Smoke checks, backup helpers, and production runbooks

That single-host production baseline is the repository completion boundary for this codebase. Shipping everything above that line is an application responsibility; shipping everything below that line is platform work.

## What Must Be Owned Outside This Repository

- High-availability networking and DNS failover
- Managed database and cache provisioning
- Secret backend lifecycle management
- SSO integration and identity governance
- Centralized alerting and incident escalation

These items are owned outside this repository because they require long-lived infrastructure control, shared platform policy, or cross-service incident response beyond the app team's delivery scope.

## Exit Criteria For Calling P3 Complete

- No production-critical state depends on one host
- Postgres, Redis, and the secret backend each have tested recovery paths
- Operators authenticate through SSO or an equivalent managed identity flow
- Secret rotation is exercised and documented as a routine operation
- Alerts exist for deploy failure, health failure, metrics regressions, and backup failures

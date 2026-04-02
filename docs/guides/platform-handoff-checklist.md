# Platform Handoff Checklist

This checklist defines the handoff from the repository-owned single-host baseline to the platform-owned enterprise deployment model.

## What The Repository Already Guarantees

- A working single-host control-plane deployment through `docker-compose.prod.yml`
- Application images, deployment workflow, smoke checks, and backup helpers
- Operator-facing management surfaces, governance flows, and runbooks for a supervised trial
- A clear baseline for Postgres, Redis, and the external secret backend integration points

## Trial-Run Ready

Use this threshold when the application team is preparing a supervised trial on one controlled host.

1. Smoke checks, metrics, and request-log correlation all pass on the candidate deployment.
2. Backup cadence, restore drill notes, and operator session revocation rehearsal are current.
3. The team can run the control plane with the repository-owned Postgres, Redis, and external secret backend wiring on a single host.
4. The operator team understands that this phase is `trial-run ready`, not `enterprise-ready`.
5. The platform handoff plan is reviewed before scaling beyond one host.

## Platform Migration Checklist

The following items must be owned, scheduled, and accepted by the platform team before the environment is called `enterprise-ready`.

### Identity

- Replace the local bootstrap-oriented operator login path with SSO or another managed operator identity provider.
- Define SSO ownership for onboarding, offboarding, break-glass access, and audit requirements.

### Data Services

- Migrate application state from single-host containers to managed Postgres and managed Redis services.
- Document who owns backups, restore validation, patching windows, failover rehearsal, and capacity planning for managed Postgres.
- Document who owns persistence configuration, recovery validation, and capacity planning for managed Redis.

### Secrets

- Move the external secret backend lifecycle under platform control, including provisioning, access review, backup policy, and token rotation.
- Confirm the application team only owns client integration and least-privilege usage, not secret-backend operations.

### Ingress And High Availability

- Replace single-host ingress with platform-owned DNS, load balancing, and HA failover.
- Define who tests high-availability failover and who is paged when failover does not occur.

### Observability And Incidents

- Stand up centralized alerting, log aggregation, dashboards, and incident escalation outside this repository.
- Define alert ownership for deploy failure, application health, backup failure, database saturation, Redis instability, and secret backend reachability.
- Document the incident escalation path between the application owners and the platform on-call team.

## Enterprise-Ready Exit Criteria

The environment is `enterprise-ready` only when all of the following are true:

1. Managed Postgres, managed Redis, and the external secret backend each have an owned lifecycle and tested recovery path.
2. Operator access is mediated through SSO or an equivalent managed identity layer.
3. HA failover is documented, exercised, and owned by the platform team.
4. Centralized alerting and incident escalation are active and tested.
5. Repository-owned runbooks are still accurate for the application layer, but no longer imply ownership of platform services.

## Recommended Migration Order

1. Establish the ownership matrix and confirm named owners for identity, data services, secrets, ingress, and observability.
2. Move to managed Postgres, then validate backups and restore behavior.
3. Move to managed Redis, then validate persistence and recovery behavior.
4. Move the external secret backend to a platform-owned lifecycle with audited rotation.
5. Introduce centralized alerting, dashboards, and incident escalation.
6. Replace local operator identity with SSO.
7. Enable HA failover and multi-host traffic management last, once upstream dependencies are already platform-owned.

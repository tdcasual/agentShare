# Platform Handoff Checklist

This checklist defines the handoff from the repository-owned single-host baseline to the platform-owned enterprise deployment model.

Use it together with:

- `docs/guides/platform-ownership-matrix.md`
- `docs/guides/platform-incident-escalation.md`
- `docs/guides/p3-readiness-review.md`

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
6. Application owner and platform owner both agree that later P3 milestones are blocked until owner, rollback, and validation artifacts exist.

## Platform Migration Checklist

The following items must be owned, scheduled, and accepted by the platform team before the environment is called `enterprise-ready`.

### Identity

- Replace the local bootstrap-oriented operator login path with SSO or another managed operator identity provider.
- Define SSO ownership for onboarding, offboarding, break-glass access, and audit requirements.
- Capture sign-off from both platform owner and security owner before production rollout.

### Data Services

- Migrate application state from single-host containers to managed Postgres and managed Redis services.
- Document who owns backups, restore validation, patching windows, failover rehearsal, and capacity planning for managed Postgres.
- Document who owns persistence configuration, recovery validation, and capacity planning for managed Redis.
- Do not execute a data-service cutover without a rollback plan and a restore or recovery rehearsal record.

### Secrets

- Move the external secret backend lifecycle under platform control, including provisioning, access review, backup policy, and token rotation.
- Confirm the application team only owns client integration and least-privilege usage, not secret-backend operations.
- Require security-owner review before changing production secret issuance or break-glass procedures.

### Ingress And High Availability

- Replace single-host ingress with platform-owned DNS, load balancing, and HA failover.
- Define who tests high-availability failover and who is paged when failover does not occur.
- Require platform-owner sign-off before enabling new traffic-management or failover behavior in production.

### Observability And Incidents

- Stand up centralized alerting, log aggregation, dashboards, and incident escalation outside this repository.
- Define alert ownership for deploy failure, application health, backup failure, database saturation, Redis instability, and secret backend reachability.
- Document the incident escalation path between the application owners and the platform on-call team.
- Require at least one incident rehearsal before calling the observability milestone complete.

## Do Not Proceed Gates

Do not start or approve a P3 milestone if any of the following are true:

1. No named application owner exists for the milestone.
2. No named platform owner exists for the milestone.
3. Security-impacting work has no named security owner.
4. There is no rollback path.
5. There is no smoke or validation checklist.
6. A stateful dependency migration has no restore or recovery proof.
7. An alert or escalation change has no incident destination.

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

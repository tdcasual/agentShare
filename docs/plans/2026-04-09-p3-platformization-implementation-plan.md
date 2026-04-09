# P3 Platformization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the P3 platformization design into an executable milestone plan that moves the project from a repository-owned single-host baseline to a platform-owned long-lived production model.

**Architecture:** Keep the application boundary stable while progressively externalizing ownership for state, secrets, identity, observability, and traffic resilience. Each milestone must be independently reviewable, reversible, and production-safe.

**Tech Stack:** FastAPI, Next.js, Postgres, Redis, OpenBao or compatible secret backend, Docker Compose/Coolify baseline, managed platform services and identity/observability stack for P3.

---

## How To Use This Plan

- Execute milestones in order.
- Do not overlap stateful dependency migrations.
- Do not start a later milestone until the previous milestone has an owner, rollback, and validation path.
- Treat platform deliverables outside the repository as first-class work items, not implicit assumptions.

## Milestone Summary

### P3.0 Ownership And Readiness

**Goal**

Create the operating boundary that all later P3 work depends on.

**Depends on**

- `docs/plans/2026-04-09-p3-platformization-design.md`
- `docs/guides/platform-roadmap.md`
- `docs/guides/platform-handoff-checklist.md`
- `docs/guides/platform-ownership-matrix.md`

**Repository touchpoints**

- Modify: `docs/guides/platform-ownership-matrix.md`
- Modify: `docs/guides/platform-handoff-checklist.md`
- Create: `docs/guides/platform-incident-escalation.md`
- Create: `docs/guides/p3-readiness-review.md`

**Platform outputs**

- named owner list for app runtime, Postgres, Redis, secrets, identity, ingress, observability
- production change approval flow
- incident routing and escalation path

**Task list**

1. Document the final ownership map for app, platform, and security responsibilities.
2. Define who approves production topology changes.
3. Define who is paged for deploy failure, health failure, database failure, Redis failure, and secret backend failure.
4. Write the readiness review document used to approve entry into P3.1.
5. Review the boundary with all named owners and capture sign-off.

**Validation**

- ownership matrix has no unowned P3 area
- escalation path exists for every critical service class
- readiness review is approved by both app and platform owners

**Exit criteria**

- no platform-critical work item remains ownerless

---

### P3.1 Managed Postgres

**Goal**

Move Postgres from single-host container lifecycle to managed lifecycle without changing application behavior.

**Depends on**

- P3.0 complete

**Repository touchpoints**

- Modify: `.env.production.example`
- Modify: `ops/compose/prod.env.example`
- Modify: `docs/guides/production-operations.md`
- Create: `docs/guides/postgres-cutover-runbook.md`
- Create: `docs/guides/postgres-restore-drill.md`
- Optional: `scripts/ops/smoke-test.sh`

**Platform outputs**

- managed Postgres instance
- backup policy
- restore process
- failover or recovery ownership

**Task list**

1. Provision managed Postgres and record connection, TLS, backup, and maintenance assumptions.
2. Verify Alembic and app connectivity against the managed instance in a staging-like environment.
3. Write the cutover runbook with rollback steps.
4. Rehearse a restore from backup into a disposable instance.
5. Cut production over to managed Postgres.
6. Run post-cutover smoke checks and compare app behavior to baseline.

**Validation**

- `alembic upgrade head` succeeds against managed Postgres
- application smoke checks pass
- restore drill is documented with timestamps and operator notes

**Exit criteria**

- Postgres no longer depends on container-local storage for production-critical recovery

---

### P3.2 Managed Redis

**Goal**

Move Redis from single-host container lifecycle to managed lifecycle with explicit persistence and recovery expectations.

**Depends on**

- P3.1 complete

**Repository touchpoints**

- Modify: `.env.production.example`
- Modify: `ops/compose/prod.env.example`
- Modify: `docs/guides/production-operations.md`
- Create: `docs/guides/redis-cutover-runbook.md`
- Create: `docs/guides/redis-recovery-notes.md`

**Platform outputs**

- managed Redis instance or replicated Redis service
- persistence policy
- recovery ownership

**Task list**

1. Provision managed Redis and record persistence mode and failover behavior.
2. Verify session, cache, and coordination behavior against the managed instance.
3. Document acceptable data-loss tolerance for Redis-backed paths.
4. Write and review the cutover runbook.
5. Execute cutover and perform reconnect validation from the app.
6. Rehearse a Redis recovery scenario and document operator actions.

**Validation**

- application remains healthy through Redis reconnect events
- smoke checks pass after cutover
- recovery notes are complete and owned

**Exit criteria**

- Redis lifecycle is no longer tied to one application host

---

### P3.3 Secret Lifecycle Hardening

**Goal**

Move secret backend operations from implicit app-host practice to explicit platform-owned lifecycle.

**Depends on**

- P3.1 complete
- P3.2 complete

**Repository touchpoints**

- Modify: `.env.production.example`
- Modify: `ops/compose/prod.env.example`
- Modify: `docs/guides/production-security.md`
- Create: `docs/guides/secret-backend-rotation-runbook.md`
- Create: `docs/guides/secret-backend-recovery-runbook.md`

**Platform outputs**

- platform-owned secret backend lifecycle
- scoped app credential
- rotation and revocation schedule

**Task list**

1. Define the production secret backend ownership model.
2. Replace ad hoc bootstrap-oriented access with a scoped app credential.
3. Document mount, prefix, namespace, and policy assumptions.
4. Rehearse credential rotation with app redeploy.
5. Rehearse backend outage and recovery behavior.

**Validation**

- app operates with least-privilege credential only
- credential rotation succeeds without code changes
- recovery path is documented and owned

**Exit criteria**

- platform owns secret backend lifecycle, app owns integration only

---

### P3.4 Centralized Observability And Incident Flow

**Goal**

Make failures visible and actionable before runtime topology becomes more complex.

**Depends on**

- P3.1 complete
- P3.2 complete
- P3.3 complete

**Repository touchpoints**

- Modify: `docs/guides/production-operations.md`
- Modify: `docs/guides/production-security.md`
- Create: `docs/guides/observability-baseline.md`
- Create: `docs/guides/incident-response-playbook.md`
- Optional: add metrics/log correlation docs under `docs/guides/`

**Platform outputs**

- centralized logs
- metrics dashboards
- alerts with owners
- incident routing

**Task list**

1. Stand up centralized log ingestion for web, api, Postgres, Redis, and secret backend.
2. Define baseline dashboards for app health, governance activity, and dependencies.
3. Add alerts for deploy failure, health failure, saturation, dependency reachability, and backup failure.
4. Define severity levels and escalation path.
5. Rehearse at least one synthetic incident end to end.

**Validation**

- alert routes point to real owners
- dashboards can explain app and dependency health during rollout
- synthetic incident rehearsal is documented

**Exit criteria**

- a production failure can be detected and routed without repository-local shell access alone

---

### P3.5 Operator Identity Modernization

**Goal**

Replace bootstrap-oriented human access with managed operator identity.

**Depends on**

- P3.4 complete

**Repository touchpoints**

- Modify: `apps/api/app/auth/*`
- Modify: `apps/api/app/routes/sessions.py`
- Modify: `apps/control-plane-v3/src/domains/identity/*`
- Modify: `docs/guides/production-security.md`
- Create: `docs/guides/operator-identity-runbook.md`
- Create: `docs/plans/<follow-up-sso-plan>.md`

**Platform outputs**

- SSO or managed operator identity provider
- onboarding/offboarding ownership
- break-glass path

**Task list**

1. Choose the operator identity provider and ownership model.
2. Design the session mapping between external identity and local roles.
3. Implement staging integration and role mapping.
4. Define offboarding and break-glass runbook.
5. Cut production over from local-only auth to managed identity.

**Validation**

- operator auth works through managed identity
- local bootstrap path is reduced to controlled break-glass use
- role revocation is testable outside the app database alone

**Exit criteria**

- operator lifecycle is no longer bootstrap-password-centric

---

### P3.6 HA Runtime And Traffic Resilience

**Goal**

Remove single-host runtime fragility once state and observability are already externalized.

**Depends on**

- P3.5 complete

**Repository touchpoints**

- Modify: deployment manifests or compose references as needed
- Modify: `docs/guides/production-operations.md`
- Create: `docs/guides/ha-cutover-runbook.md`
- Create: `docs/guides/failover-rehearsal.md`

**Platform outputs**

- platform-owned ingress
- DNS/load balancing
- multi-node or managed runtime deployment
- failover ownership

**Task list**

1. Define target runtime topology and failover behavior.
2. Stand up secondary execution capacity or managed runtime equivalent.
3. Put platform-owned ingress and traffic management in front of the app.
4. Rehearse node loss, deployment rollback, and traffic failover.
5. Document normal operations and failure operations.

**Validation**

- one host loss does not imply production-critical outage or data loss
- rollback and failover can be executed by named owners

**Exit criteria**

- runtime availability no longer depends on one Docker host

---

## Cross-Milestone Hard Gates

Do not proceed to the next milestone if any of these are missing:

- no named owner
- no rollback path
- no smoke checklist
- no restore or recovery proof for stateful services
- no incident destination for new alerts

## Suggested Ticket Structure

Use the following epic layout:

- `P3.0` Ownership And Readiness
- `P3.1` Managed Postgres
- `P3.2` Managed Redis
- `P3.3` Secret Lifecycle Hardening
- `P3.4` Observability And Incident Flow
- `P3.5` Operator Identity Modernization
- `P3.6` HA Runtime And Traffic Resilience

Each epic should contain:

- one architecture task
- one rollout task
- one rollback task
- one validation task
- one documentation/sign-off task

## Recommended Execution Order For This Repository

1. Finish `P3.0` documents and sign-offs first.
2. Open a dedicated plan for `P3.1 Managed Postgres`.
3. Execute stateful service migration milestones one by one.
4. Delay SSO and HA runtime until state, secrets, and observability are already platform-owned.

## Final Acceptance Standard

P3 may be called complete only when:

- the ownership matrix is signed off
- Postgres, Redis, and secret lifecycle are platform-owned with recovery proof
- centralized alerts and dashboards are active
- operator identity is managed
- failover is rehearsed
- repository docs still match the real operating model

# P3 Platformization Design

This design builds on the current **agent server first** application baseline. P3 extends the operating model around the app, but it does not redefine the product into a token service or move the conceptual center away from the governed agent server.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move the project from the current single-host `trial-run ready` baseline to a platformized `P3` operating model that is safer, easier to govern, and structurally ready for long-lived public production use.

**Architecture:** Keep the current application boundary intact, but progressively externalize the stateful and operational concerns that should not remain repository-owned: operator identity, data services, secret lifecycle, observability, and high-availability traffic management. P3 is not a rewrite. It is a staged platform migration with explicit ownership boundaries.

**Tech Stack:** FastAPI, Next.js, Postgres, Redis, OpenBao or compatible secret backend, Docker Compose/Coolify today, managed platform services or orchestrated runtime in P3.

---

## Design Intent

`v1` gives this project a strong application baseline:

- application behavior is now front-back contract aligned
- the single-host deployment path is documented
- governance, tasks, reviews, tokens, and OpenClaw-oriented agent flows are working

P3 should not compete with that baseline. It should harden the surrounding operating model.

The core question for P3 is:

How do we keep the app behavior stable while removing the remaining single-host and bootstrap-oriented operational risks?

This design answers that by treating P3 as five workstreams with a strict migration order:

1. ownership and operating boundary
2. managed data services
3. managed secret lifecycle
4. centralized observability and incident flow
5. operator identity plus multi-host traffic resilience

## Recommended P3 Shape

There are three realistic P3 shapes:

### Option A: Managed-services-first platformization

Move Postgres, Redis, secret backend, observability, and operator identity out of the app host first. Keep app deployment itself relatively simple until the dependencies are platform-owned.

Why this is the recommended option:

- lowest disruption to the current codebase
- strongest risk reduction earliest
- easiest to validate incrementally
- fits the repository's current maturity

### Option B: Container-orchestrator-first platformization

Move directly to Kubernetes or another orchestrator before migrating backing services.

Why this is weaker right now:

- adds operational complexity before ownership boundaries are stable
- risks replacing one kind of single-point fragility with another

### Option C: Security-and-identity-first platformization

Start with SSO and secret lifecycle, then migrate data and runtime later.

Why this is incomplete:

- improves governance but leaves data durability and failover risk too exposed

Recommendation: use **Option A**.

## P3 Target State

P3 is complete when all of the following are true:

- no production-critical state depends on one Docker host
- Postgres has managed backup, restore rehearsal, and failover ownership
- Redis has managed persistence and recovery ownership
- the secret backend has lifecycle ownership outside this repository
- operators authenticate through a managed identity layer instead of bootstrap-oriented local access alone
- logs, alerts, and dashboards are centralized
- deploy failure, app health failure, data service degradation, and backup failure have named alert owners
- app rollout can survive a single node failure or can be recreated on a second node without state loss

## Non-Goals

P3 does not mean:

- rewriting the API or frontend around a new architecture
- removing Coolify support for simple self-host use
- replacing existing governance flows
- building enterprise features with no operating owner

## Workstream 1: Ownership And Boundary

This is the gate for all later work.

Deliverables:

- a named owner for app runtime, data, secrets, identity, ingress, and observability
- an agreed response model for incidents that cross app and platform boundaries
- a signed-off boundary between `repository-owned` and `platform-owned` responsibilities

Required outputs:

- refine `docs/guides/platform-ownership-matrix.md`
- define escalation path for platform incidents
- define who approves production topology changes

Exit condition:

- no critical platform responsibility remains ownerless

## Workstream 2: Managed Data Services

This is the first real infrastructure migration.

Scope:

- move Postgres from container-local lifecycle to managed lifecycle
- move Redis from container-local lifecycle to managed lifecycle

Design rules:

- move Postgres first, Redis second
- do not change both at once
- require restore rehearsal before calling each migration complete

Postgres phase must include:

- managed instance provisioning
- migration compatibility validation
- snapshot policy
- point-in-time or equivalent restore strategy
- rollback plan back to previous app revision

Redis phase must include:

- persistence expectations
- session/cache loss tolerance documentation
- reconnect and failover validation from the app

Exit condition:

- both data services have tested recovery paths and named operational owners

## Workstream 3: Secret Lifecycle Hardening

The current app can talk to an external secret backend. P3 requires the lifecycle of that backend to stop being implicit.

Scope:

- move secret backend operations under platform ownership
- define scoped runtime access model
- document rotation, revocation, and recovery

Design rules:

- the app team owns integration and least-privilege usage
- the platform team owns provisioning, backup policy, token issuance, and rotation
- production must stop depending on ad hoc root-token handling

Target model:

- app gets a scoped client credential
- secret mount and namespace policy are explicit
- rotation cadence is routine, not emergency-only

Exit condition:

- secret rotation is rehearsed and documented

## Workstream 4: Observability And Incident Flow

P3 should make failures visible before it makes topology more complex.

Scope:

- aggregate app logs
- centralize metrics and health views
- add alert routing
- define incident handoff

Minimum alert set:

- deploy failed
- `/healthz` failed
- app error rate regression
- Postgres saturation or connectivity failure
- Redis instability
- secret backend unreachable
- backup failure

Minimum dashboard set:

- app request health
- task/review/governance activity
- data service health
- secret backend health
- release rollout health

Exit condition:

- alerts are routed to real owners and have tested response paths

## Workstream 5: Operator Identity And HA Runtime

This should happen last, once the dependent services are stable.

Scope:

- replace bootstrap-oriented operator auth with SSO or managed operator identity
- move from single-host ingress to platform-owned ingress and failover

Identity target:

- SSO-backed operator access
- offboarding and access review outside the app database alone
- break-glass process documented separately

Runtime target:

- at least two execution locations or one platform-managed runtime with non-local state
- platform-owned DNS/TLS/load balancing
- documented failover behavior

Exit condition:

- one host failure does not imply loss of production-critical control-plane state

## Recommended Phase Order

### Phase 0: P3 Readiness

- confirm owners
- freeze baseline architecture documents
- define success metrics

### Phase 1: Managed Postgres

- provision
- migrate
- restore drill
- smoke verify

### Phase 2: Managed Redis

- provision
- migrate
- reconnect validation
- recovery validation

### Phase 3: Secret Backend Hardening

- platform-owned backend lifecycle
- scoped app credential
- rotation rehearsal

### Phase 4: Centralized Observability

- logs
- metrics
- dashboards
- alert routing

### Phase 5: Operator Identity

- SSO integration
- break-glass model
- offboarding process

### Phase 6: HA Runtime And Traffic

- multi-node or platform-managed runtime
- failover validation
- release rollback rehearsal

## Delivery Slices

Each phase should ship as a bounded milestone with:

- one architecture decision record
- one rollout plan
- one rollback plan
- one smoke checklist
- one ownership sign-off

Do not allow P3 to become an open-ended “infra cleanup” bucket.

## Suggested Epics

### Epic A: Platform Boundary Lock-In

- finalize ownership matrix
- define production change approval model
- define incident routing

### Epic B: Stateful Dependency Migration

- managed Postgres migration
- managed Redis migration
- rehearse recovery for both

### Epic C: Secret Operating Model

- externalize secret backend ownership
- rotate app credentials safely
- prove recovery and revocation

### Epic D: Visibility And Reliability

- central logs
- centralized metrics
- alert routing and escalation

### Epic E: Enterprise Access And Runtime

- operator SSO
- break-glass access
- HA ingress and runtime validation

## Hard Gates

P3 should stop if any of these are missing:

- unnamed owner for a migrated dependency
- no rollback path for a phase
- no smoke validation after migration
- no restore or recovery proof for a stateful dependency
- no incident destination for a new alert

## Repository Impact

Expected repository changes during P3:

- more env and deployment docs
- provider adapters for SSO and secret credentials
- more health and metrics surfaces
- more integration tests around external dependency behavior

What should not happen:

- the repository should not absorb platform ownership of managed services
- app code should not hardcode one provider-specific enterprise topology

## Exit Review

Before calling P3 done, run a final review across these questions:

1. Can the app survive host replacement without data loss?
2. Can operator access be revoked outside the local bootstrap-only path?
3. Can secret access be rotated without emergency edits?
4. Are failures visible to a real on-call path?
5. Is the platform boundary documented tightly enough that ownership disputes do not block incidents?

If any answer is “not yet,” P3 is not complete.

## Immediate Next Step

Turn this design into an execution plan with milestone tickets:

- P3.0 ownership and readiness
- P3.1 managed Postgres
- P3.2 managed Redis
- P3.3 secret lifecycle hardening
- P3.4 observability and incidents
- P3.5 operator identity
- P3.6 HA runtime

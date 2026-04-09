# HA Cutover Runbook

This runbook prepares `P3.6 HA Runtime And Traffic Resilience`.

## Purpose

Guide the cutover from a single-host runtime to a platform-owned HA runtime or equivalent managed deployment model.

## Preconditions

- Postgres, Redis, and secret lifecycle are already platform-owned
- observability is centralized
- operator identity is managed
- failover owner is named

## Cutover Steps

1. Confirm secondary runtime capacity exists.
2. Confirm ingress and traffic-management rules are ready.
3. Confirm rollback path to the prior runtime topology.
4. Shift a controlled portion of traffic or perform the planned cutover.
5. Validate health, smoke, and operator workflows.
6. Record the result and any failover issues.

## Rollback

Rollback if:

- health fails after cutover
- operator workflows regress
- failover behavior is not as designed

Rollback must restore the last known-good traffic path and runtime topology.

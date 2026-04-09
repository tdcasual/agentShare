# Managed Redis Cutover Runbook

This runbook is the repository-side guide for `P3.2 Managed Redis`.

## Purpose

Move Redis-backed coordination and session-related runtime behavior from the single-host stack to a managed Redis service.

## Preconditions

- `P3.1 Managed Postgres` is complete.
- Managed Redis persistence and failover assumptions are documented.
- Reconnect behavior has been tested in a staging-like environment.
- Application owner and platform owner are named for the cutover.

## Required Inputs

- managed Redis URL
- rollback target
- smoke checklist
- reconnect validation checklist

## Cutover Steps

1. Freeze risky app changes during the cutover window.
2. Confirm the managed Redis instance is reachable from the app runtime.
3. Update production Redis configuration.
4. Restart or redeploy the app with managed Redis settings.
5. Watch for startup failures and coordination errors.
6. Run smoke checks.
7. Validate flows sensitive to Redis-backed coordination:
   - management session activity
   - task claim or task-target claim
   - capability invoke/lease coordination if enabled
8. Record final status and any reconnect anomalies.

## Validation

- app remains healthy after reconnect
- no widespread `503` coordination failures appear
- smoke checks pass

## Rollback

1. Restore previous Redis connection settings.
2. Redeploy or restart the prior known-good runtime.
3. Re-run smoke checks.
4. Capture failure notes for the next attempt.

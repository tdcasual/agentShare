# Managed Postgres Cutover Runbook

This runbook is the repository-side guide for `P3.1 Managed Postgres`.

## Purpose

Move production from container-local Postgres lifecycle to a managed Postgres service without changing application behavior.

## Preconditions

- `P3.0 Ownership And Readiness` is complete.
- Application owner and platform owner are named.
- Managed Postgres endpoint, TLS mode, maintenance assumptions, and backup policy are documented.
- A rollback target still exists and is reachable.
- `alembic upgrade head` has already been tested against a staging-like managed Postgres instance.

## Required Inputs

- managed Postgres connection string
- rollback connection string or old deployment target
- latest successful backup reference
- smoke checklist
- maintenance window

## Cutover Steps

1. Freeze risky deploys during the cutover window.
2. Confirm the latest production backup completed successfully.
3. Run application smoke checks against the current environment and record the baseline.
4. Update the production database configuration to point at managed Postgres.
5. Run `alembic upgrade head` against the managed instance.
6. Restart or redeploy the application with the new database connection.
7. Run post-cutover smoke checks.
8. Verify task, review, token, and operator-session flows.
9. Record cutover completion time and any deviations.

## Validation

- `/healthz` is healthy
- smoke checks pass
- management login works
- task listing and review listing work
- no schema drift errors appear in API logs

## Rollback

Rollback if:

- app boot fails against managed Postgres
- migrations fail
- smoke checks fail in a production-critical path

Rollback steps:

1. Restore previous database connection settings.
2. Redeploy the prior known-good app revision if needed.
3. Re-run smoke checks.
4. Record failure notes before attempting the next cutover.

## Completion Record

Capture:

- cutover start and end time
- owners on call
- migration result
- smoke result
- rollback used or not used
- follow-up tasks

# Managed Postgres Restore Drill

This guide records the minimum restore rehearsal expected before `P3.1 Managed Postgres` is considered complete.

## Purpose

Prove that the managed Postgres backup strategy can restore application state to a usable target environment.

## Drill Scope

- restore into a non-production environment
- validate schema compatibility
- validate app connectivity
- record elapsed time and manual interventions

## Preconditions

- latest backup artifact is available
- restore target environment is disposable
- application owner and platform owner are present or have delegated approval

## Drill Steps

1. Select the backup artifact and record its timestamp.
2. Restore the backup into the target Postgres environment.
3. Point a disposable app environment at the restored database.
4. Run `alembic upgrade head` only if the rehearsal requires it for compatibility validation.
5. Run smoke checks against the restored environment.
6. Verify a few high-value paths:
   - management session login
   - tasks list
   - reviews list
   - token list
7. Record duration, issues, and data gaps if any.

## Minimum Evidence

- restore artifact identifier
- restore start and finish time
- smoke-check output
- list of manual steps
- named owners who reviewed the result

## Failure Conditions

The drill is not acceptable if:

- restore cannot complete in the target environment
- app cannot connect after restore
- schema compatibility is broken
- operators cannot explain which manual steps are required

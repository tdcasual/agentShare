# Production Operations

## Backup Cadence

- Run a Postgres logical backup at least daily and before every risky schema or release change.
- Capture a Redis snapshot on a cadence that matches your recovery point objective.
- Store backup artifacts off-host and encrypted; the deployment host is not the backup system.
- Keep the external secret backend on its own backup cadence outside this repository.

## Restore Drill

- Practice a full restore drill on a non-production environment at a regular cadence.
- Restore Postgres from the latest `pg_dump` artifact before reconnecting application traffic.
- Restore Redis only after confirming the Postgres state you restored is the target recovery point.
- Record restore duration, data gaps, and any manual steps after each drill.

## Incident Entry Points

- Check the deploy smoke logs first if a release just completed.
- Check `/healthz` and `/metrics` before debugging application routes.
- Treat the external secret backend, Postgres, and Redis as the first three upstream dependencies to verify.

## Minimum Recovery Procedure

1. Stop writes to the production stack.
2. Restore Postgres with `scripts/ops/restore-postgres.sh`.
3. Restore Redis from the latest valid snapshot if the incident requires it.
4. Validate the external secret backend is reachable and unchanged.
5. Bring the application stack back and rerun smoke checks.

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
- The smoke script should confirm both reachability and the presence of an `x-request-id` header on `/healthz`, so early failures still leave a trace handle for request-log correlation.
- Check `/healthz` and `/metrics` before debugging application routes.
- On `/metrics`, inspect `agent_control_plane_http_requests_total{method,path,status}` to see which method/path/status combinations are failing or spiking first.
- Capture the `x-request-id` from the failing response and use it to trace the matching structured request log entry.
- The structured request log now records `request_id`, method, path, status, and duration, so responders can align a failing response with its API-side timing without reading source code.
- Idempotent write replay is scoped to `method + path + payload` fingerprinting, not just the bare `Idempotency-Key`; retries that change endpoint or body are treated as new operations.
- Treat the external secret backend, Postgres, and Redis as the first three upstream dependencies to verify.

## Minimum Recovery Procedure

1. Stop writes to the production stack.
2. Restore Postgres with `scripts/ops/restore-postgres.sh`.
3. Restore Redis from the latest valid snapshot if the incident requires it.
4. Validate the external secret backend is reachable and unchanged.
5. Bring the application stack back and rerun smoke checks.

## Control Plane Verification Flow

Run this workflow after shipping navigation, governance, or demo-sandbox changes in the management console:

1. Open an inbox event and verify the deep link lands in a focused task, review, identity, asset, or space context.
2. Confirm the selected management page shows the focused summary state and highlights the relevant item.
3. Perform one human governance action and confirm the review queue updates without breaking marketplace ownership semantics.
4. Check the marketplace and assets pages to confirm they now display the same governance outcome.
5. Open the equivalent `/demo` route only as a sandbox comparison and confirm the page still points operators back to the live management surface.

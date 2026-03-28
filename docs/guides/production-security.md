# Production Security

This guide covers the security controls that live inside this repository. It complements the deployment and operations guides and assumes the production stack already runs behind `caddy`.

## Ingress Security

- `ops/caddy/Caddyfile` is the source of truth for public entrypoint behavior.
- The production stack serves traffic through Caddy only; `api`, `web`, `postgres`, and `redis` are not published directly.
- Caddy applies baseline security headers:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`

## Secret Rotation

- Rotate `DEPLOY_ENV_FILE` whenever production app secrets, domains, or database credentials change.
- The deploy workflow rewrites `.env.production` on every run, so rotation changes are not silently ignored.
- Rotate `SECRET_BACKEND_TOKEN` in the external secret backend according to the provider's least-privilege policy.
- Rotate `BOOTSTRAP_AGENT_KEY` and `MANAGEMENT_SESSION_SECRET` whenever operator trust changes or after an incident.

## Fail-Fast Configuration

- Production and staging must replace the placeholder values `changeme-bootstrap-key` and `changeme-management-session-secret` before the API can boot.
- Production and staging must set `MANAGEMENT_SESSION_SECURE=true` so browser session cookies are always marked secure.
- Management sessions are intentionally short-lived and now carry a distinct `session_id` for audit correlation. Treat each new login as a fresh operator session, not a renewable long-lived admin credential.
- If you customize operator identity through `MANAGEMENT_OPERATOR_ID` or `MANAGEMENT_OPERATOR_ROLE`, keep those values stable and human-readable so audit trails remain legible.
- Supported management roles are `viewer`, `operator`, `admin`, and `owner`.
- Use `viewer` for read-only management visibility such as capability inventory, runs, and playbook search.
- Use `operator` for approval review and decision-making without secret or agent inventory changes.
- Use `admin` for secret inventory, capability creation, and agent creation/listing.
- Use `owner` when the session must also be able to delete agent identities.
- If Redis-backed idempotency middleware cannot initialize, development logs the reason explicitly and production fails fast instead of silently degrading.

## Container Security Scan

- `.github/workflows/security.yml` runs a Trivy security scan against the published `ghcr.io` images.
- The workflow supports both scheduled execution and manual `workflow_dispatch`.
- Treat `CRITICAL` and `HIGH` findings as release blockers until they are triaged or fixed.

## Incident Entry Points

- Start with the deployment smoke check, `/healthz`, and `/metrics`.
- Use the response `x-request-id` header to correlate operator reports with API request logs.
- Review the latest deploy logs and the Trivy scan output before assuming the issue is application-only.
- If a secret compromise is suspected, rotate the external secret backend token first, then redeploy with updated `DEPLOY_ENV_FILE`.

# Production Security

## Trust boundaries

- Caddy is the only public entrypoint on ports 80/443.
- API, web, and PostgreSQL remain private services.
- Browser Sessions are random opaque credentials stored as SHA-256 hashes in the database.
- Logout and expiry are enforced server-side.
- `vgm_` management Tokens and `vg_` Agent Tokens are distinct credentials and API boundaries.

## Required configuration

- `ENCRYPTION_KEY`: unique base64-encoded 32-byte AES key.
- `SESSION_SECURE=true`: required for staging and production.
- `CORS_ALLOWED_ORIGINS`: exact trusted browser origins.
- `POSTGRES_PASSWORD`: strong unique database password.

Production startup fails when the default encryption key or insecure cookies are configured.

## Application protections

- AES-256-GCM encrypted Secret values with versioned payloads.
- Explicit Token-to-Secret grants and default deny.
- `HttpOnly`, `Secure`, `SameSite=Lax` Session cookies.
- Origin/Referer validation for browser writes.
- Login limiting keyed by client IP and administrator email; forwarded addresses are trusted only from configured proxies.
- Token and Session plaintext is returned only once and never persisted.
- Secret value responses use `Cache-Control: no-store`.
- Structured audit snapshots remain understandable after resources are removed.

## Security verification

- `.github/workflows/security.yml` runs Trivy against the published API, web, Caddy, and PostgreSQL images on a weekly schedule, on relevant `main` changes, and on manual dispatch.
- Trivy fails the workflow when a published image contains a fixed Critical or High vulnerability.
- The PostgreSQL image preserves the official PostgreSQL 16 runtime and entrypoint while rebuilding its `gosu` helper with the patched Go toolchain declared in `apps/postgres/Dockerfile`.
- Caddy adds security headers including HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` at the public boundary.

Review the latest security workflow before promoting an image. A passing source build does not replace an image scan.

## Secret rotation

- Rotate Agent and management Tokens through the admin API or control plane; revoke the replaced credential after dependants have switched.
- Rotate database credentials through the deployment secret store and restart the affected services.
- Treat `ENCRYPTION_KEY` rotation as a keyring migration because existing ciphertext remains bound to its original key.

## Rotation and incidents

1. Check `/healthz` and `/readyz`.
2. Correlate logs with `x-request-id`.
3. Review `/audit` or `/api/admin/audit-logs`.
4. Revoke or rotate affected Agent/management Tokens.
5. If stored ciphertext may be exposed, rotate `ENCRYPTION_KEY` through a planned keyring migration and redeploy.
6. Rotate the PostgreSQL password when database credentials may be compromised.

The API and web containers run as non-root users, and the PostgreSQL entrypoint drops to its database user. Caddy retains root UID only to own its persisted state and bind public ports; production Compose drops all capabilities except `NET_BIND_SERVICE`, uses a read-only root filesystem, and enables `no-new-privileges`.

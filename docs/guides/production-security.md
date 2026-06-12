# Production Security

## Ingress Security

- Caddy is the only public entrypoint on ports 80/443.
- API, Web, and PostgreSQL are not published directly.
- Caddy applies security headers: HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.

## Application Security

- **Encryption**: Secrets are encrypted at rest with AES-256-GCM.
- **Session cookies**: HMAC-SHA256 signed, httponly, samesite=lax, configurable secure flag.
- **CSRF protection**: Origin/Referer validation on state-changing requests.
- **Rate limiting**: Login endpoint is rate-limited (5 attempts per 5 minutes).
- **Password policy**: Minimum 12 characters, mixed case, digits, and special characters.
- **Token security**: Tokens stored as SHA-256 hashes, shown only once at creation.

## Secret Rotation

Rotate these values periodically and after any suspected compromise:

- `ENCRYPTION_KEY`: Generate with `python3 -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"`
- `SESSION_SECRET`: Generate with `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
- `POSTGRES_PASSWORD`: Use a strong random password

## Fail-Fast Configuration

Production settings enforce:

- `ENCRYPTION_KEY` must not be the default development key
- `SESSION_SECRET` must not be the default development secret
- `SESSION_SECURE` must be `true`
- `APP_ENV` must be `production` or `staging`

## Container Security

- `.github/workflows/security.yml` runs Trivy scans weekly.
- `CRITICAL` and `HIGH` findings are release blockers.
- All containers run as non-root users.
- Production compose uses `read_only: true` and `no-new-privileges`.

## Incident Response

1. Check `/healthz` and `/metrics` endpoints.
2. Use `x-request-id` header to correlate requests with logs.
3. Review audit logs via the web UI at `/audit`.
4. If secret compromise is suspected, rotate `ENCRYPTION_KEY` and `SESSION_SECRET`, then redeploy.

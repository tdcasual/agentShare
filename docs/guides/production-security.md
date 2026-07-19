# Production Security

## Trust boundaries

- Caddy is the only public entrypoint on ports 80/443.
- API, web, and PostgreSQL remain private services.
- Browser Sessions are random opaque credentials stored as SHA-256 hashes in the database.
- Logout and expiry are enforced server-side.
- `vgm_` management Tokens and `vg_` Agent Tokens are distinct credentials and API boundaries.

## Required configuration

- `ENCRYPTION_KEY`: unique base64-encoded 32-byte AES key.
- `ENCRYPTION_ACTIVE_KEY_ID`: key id used for new ciphertext (default `current`).
- `ENCRYPTION_KEYRING`: optional JSON object of legacy key ids to base64 keys.
- `SESSION_SECURE=true`: required for staging and production.
- `CORS_ALLOWED_ORIGINS`: exact trusted browser origins.
- `POSTGRES_PASSWORD`: strong unique database password.

Production startup fails when the default encryption key or insecure cookies are configured.
Secrets can be supplied through the corresponding `_FILE` settings. Direct and file-backed values
are mutually exclusive, and key recovery can be verified without exposing key material using
`scripts/ops/verify-key-recovery.sh`.

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

- `.github/workflows/docker-images.yml` builds each commit image once, scans that exact local artifact with Trivy, and only pushes it after the scan passes.
- `.github/workflows/security.yml` independently rescans the published API, web, Caddy, and PostgreSQL `latest` images on a weekly schedule or manual dispatch.
- Trivy fails the workflow when a published image contains a fixed Critical or High vulnerability.
- The PostgreSQL image preserves the official PostgreSQL 16 runtime and entrypoint while rebuilding its `gosu` helper with the patched Go toolchain declared in `apps/postgres/Dockerfile`.
- Caddy adds security headers including HSTS, `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` at the public boundary.

Review the latest security workflow before promoting an image. A passing source build does not replace an image scan.

## Secret rotation

- Rotate Agent and management Tokens through the admin API or control plane; revoke the replaced credential after dependants have switched.
- Rotate database credentials through the deployment secret store and restart the affected services.
- New ciphertext records the active key id. Keep old keys in `ENCRYPTION_KEYRING` until all data is re-encrypted, then remove them.
- Keep active and historical keys in a versioned secret store plus an offline, dual-control recovery copy.
- Run the keyring recovery audit before removing any historical key.

## Encryption key rotation

New ciphertext records the active key id in its `v2:<key-id>:` envelope, and any key in
`ENCRYPTION_KEY` plus `ENCRYPTION_KEYRING` can decrypt. Rotation therefore never makes existing
data unreadable as long as the old key stays in the keyring until every record is re-encrypted.
Key ids must match `^[A-Za-z0-9._-]{1,32}$` and the active id must not duplicate a keyring id —
startup fails on either violation.

1. **Record the current state.** Note the current `ENCRYPTION_KEY` value and
   `ENCRYPTION_ACTIVE_KEY_ID` (default `current`). Escrow the new key first.
2. **Move the old key into the keyring.** Set `ENCRYPTION_KEYRING` to a JSON object mapping the
   old active id to the old key, for example `{"current":"<old-base64-key>"}`.
3. **Set the new active key.** Set `ENCRYPTION_KEY` to the new base64 32-byte key and
   `ENCRYPTION_ACTIVE_KEY_ID` to a new id (for example `key-2026-07`). The `_FILE` variants work
   the same way; direct and file-backed values remain mutually exclusive.
4. **Restart the API.** Update all API replicas in one compose operation
   (`docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml up -d --no-deps api`).
   Do not run a slow one-replica-at-a-time rollout: replicas on the old configuration cannot
   decrypt `v2:<new-id>:` records written by updated replicas, while updated replicas decrypt
   everything through the keyring. Keeping the mixed window to a single `up -d` avoids user-facing
   decrypt failures.
5. **Re-encrypt stored Secrets.** Call the admin endpoint with a browser session cookie or a
   `vgm_` management Token:

   ```bash
   curl -fsS -X POST \
     -H "Authorization: Bearer ${VGM_TOKEN}" \
     "https://${PUBLIC_HOST}/api/admin/secrets/reencrypt"
   ```

   The response is `{"updated": <count>}`. The call re-encrypts every Secret whose envelope id is
   not the active id, is idempotent, and writes a `secret.reencrypt` audit record. It only covers
   Secrets; encrypted idempotency replay records stay under their original key until retention
   (`IDEMPOTENCY_RETENTION_DAYS`, default 7 days) removes them, which is why step 6 matters.
6. **Verify the keyring.** Run `./scripts/ops/verify-key-recovery.sh` and confirm
   `"status": "ok"`. Its `key_usage` map shows which key ids still protect data; keep the old key
   in `ENCRYPTION_KEYRING` until the old id no longer appears there (idempotency records may
   reference it for up to the retention window).
7. **Remove the old key.** Drop it from `ENCRYPTION_KEYRING`, restart the API, and re-run
   `verify-key-recovery.sh` — it must still report `"status": "ok"`.

Rollback:

- Before step 5: restore the previous `ENCRYPTION_KEY`/`ENCRYPTION_ACTIVE_KEY_ID` and empty the
  keyring, then restart. All data is still under the old key.
- After step 5: data now lives under the new key, so roll back by putting the *new* key into
  `ENCRYPTION_KEYRING` under its id and restoring the old `ENCRYPTION_KEY`/`ENCRYPTION_ACTIVE_KEY_ID`,
  then restart. Do not simply revert to the old-key-only configuration — records already
  re-encrypted would become undecryptable.

During the whole procedure reads keep working: decryption tries the envelope's key id against the
full keyring, and writes always use the active key. A record is only at risk if its key id is
absent from both `ENCRYPTION_KEY` and `ENCRYPTION_KEYRING`; `verify-key-recovery.sh` reports that
condition as `missing-key` failures.

## Rotation and incidents

1. Check `/healthz` and `/readyz`.
2. Correlate logs with `x-request-id`.
3. Review `/audit` or `/api/admin/audit-logs`.
4. Revoke or rotate affected Agent/management Tokens.
5. If stored ciphertext may be exposed, rotate `ENCRYPTION_KEY` through a planned keyring migration and redeploy.
6. Rotate the PostgreSQL password when database credentials may be compromised.

The API and web containers run as non-root users, and the PostgreSQL entrypoint drops to its database user. Caddy retains root UID only to own its persisted state and bind public ports; production Compose drops all capabilities except `NET_BIND_SERVICE`, uses a read-only root filesystem, and enables `no-new-privileges`. The api and web containers drop all capabilities as well; PostgreSQL keeps its default set because its entrypoint requires `gosu`.

# VaultGate Setup Guide

VaultGate is a simplified key storage and token issuance service. This guide covers deployment and initial setup.

## Quick Start (Docker)

```bash
# 1. Generate security keys
python3 -c 'import secrets, base64; print("ENCRYPTION_KEY=" + base64.b64encode(secrets.token_bytes(32)).decode())'
python3 -c 'import secrets; print("SESSION_SECRET=" + secrets.token_urlsafe(32))'

# 2. Copy and update .env
cp .env.example .env
# Edit .env with your generated keys

# 3. Start services
docker compose up -d --build

# 4. Wait for services to be healthy
docker compose ps

# 5. Create initial user
curl -X POST http://localhost:8000/api/bootstrap/init \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-secure-password"}'
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_ENV` | Environment (development/staging/production) | development | No |
| `DATABASE_URL` | PostgreSQL connection string | postgresql://... | Yes |
| `ENCRYPTION_KEY` | AES-256 encryption key (base64, 44 chars) | **changeme...** | Yes |
| `SESSION_SECRET` | Session cookie secret | **changeme...** | Yes |
| `SESSION_SECURE` | Use secure cookies (HTTPS required) | false | No |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | localhost:3000,8000 | No |

## Security Key Generation

Generate strong production keys:

```bash
# ENCRYPTION_KEY (32 bytes, base64-encoded)
python3 -c 'import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())'

# SESSION_SECRET (URL-safe token)
python3 -c 'import secrets; print(secrets.token_urlsafe(32))'
```

## API Endpoints

### Public (No Authentication)
- `GET /healthz` - Health check
- `GET /version` - Version info
- `GET /docs` - API documentation (Swagger UI)
- `GET /openapi.json` - OpenAPI schema

### Bootstrap
- `POST /api/bootstrap/init` - Create initial user (only works if no users exist)

### Authentication
- `POST /api/session/login` - Login with email/password
- `POST /api/session/logout` - Logout
- `GET /api/session/me` - Get current user

### Secrets Management (Web UI, requires session)
- `GET /api/secrets` - List secrets
- `POST /api/secrets` - Create secret
- `GET /api/secrets/:id` - Get secret details
- `PATCH /api/secrets/:id` - Update secret
- `DELETE /api/secrets/:id` - Delete secret

### Token Management (Web UI, requires session)
- `POST /api/tokens` - Create token
- `GET /api/tokens` - List tokens
- `GET /api/tokens/:id` - Get token details
- `DELETE /api/tokens/:id` - Revoke token
- `POST /api/tokens/:id/scopes` - Add scope
- `GET /api/tokens/:id/scopes` - List scopes
- `DELETE /api/tokens/:id/scopes/:secret_id` - Remove scope

### Vault Runtime API (Bearer Token, for Agents)
- `GET /api/me` - Verify token and get token info
- `GET /api/vault` - List accessible secrets (metadata only)
- `GET /api/vault/:id` - Get secret with optional field filtering
- `GET /api/vault/:id/value` - Get only secret value (most efficient)
- `POST /api/vault/batch` - Batch get with field filtering

### Audit Logs (Web UI, requires session)
- `GET /api/audit-logs` - Query audit logs

## Field Filtering

Agents can request specific fields to minimize data transfer:

```bash
# Get only URL and value
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/vault/SECRET_ID?fields=url,value"

# Get only value (most efficient for agents)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/vault/SECRET_ID/value"
```

**Important**: The `value` field is NEVER returned by default. It must be explicitly requested.

## Database Migration

```bash
# Run Alembic migration
docker compose exec api alembic upgrade head

# Or let the app auto-migrate on first start (SQLite only)
```

## Production Deployment

1. **Use PostgreSQL** (not SQLite)
2. **Generate strong encryption keys**
3. **Enable HTTPS** and set `SESSION_SECURE=true`
4. **Restrict CORS origins** to your frontend domain only
5. **Use secrets manager** (e.g., HashiCorp Vault) for `ENCRYPTION_KEY`

## Troubleshooting

### Migration fails with "Can't locate revision"
Delete the database and restart:
```bash
docker compose down -v
docker compose up -d --build
```

### Bootstrap endpoint returns 409
VaultGate is already initialized. Use `/api/session/login` instead.

### Token returns 401
Check that token is not expired (`status=active`) and has proper scopes.

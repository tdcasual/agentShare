# VaultGate Testing & Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Python 3.12+ (for local development without Docker)

## Step 1: Generate Security Keys

```bash
# Generate ENCRYPTION_KEY (32 bytes, base64-encoded)
python3 -c 'import secrets, base64; print("ENCRYPTION_KEY=" + base64.b64encode(secrets.token_bytes(32)).decode())'

# Generate SESSION_SECRET
python3 -c 'import secrets; print("SESSION_SECRET=" + secrets.token_urlsafe(32))'
```

## Step 2: Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your generated keys
nano .env
```

Required variables in `.env`:
```env
APP_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/vaultgate
ENCRYPTION_KEY=<your-generated-key>
SESSION_SECRET=<your-generated-secret>
SESSION_SECURE=false
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000
```

## Step 3: Start Services

```bash
# Build and start all services
docker compose up -d --build

# Check service health
docker compose ps

# View logs
docker compose logs -f api
```

## Step 4: Initialize VaultGate

### Create First User

```bash
curl -X POST http://localhost:8000/api/bootstrap/init \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password"
  }'
```

Expected response:
```json
{
  "message": "VaultGate initialized successfully",
  "user_id": "...",
  "email": "admin@example.com",
  "next_step": "Use /api/session/login to log in with your credentials."
}
```

### Verify API is Accessible

```bash
# Health check
curl http://localhost:8000/healthz

# API documentation (should be public)
curl http://localhost:8000/docs
curl http://localhost:8000/openapi.json
```

## Step 5: Test Authentication Flow

### Login

```bash
curl -X POST http://localhost:8000/api/session/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@example.com",
    "password": "your-secure-password"
  }'
```

### Get Current User

```bash
curl http://localhost:8000/api/session/me \
  -b cookies.txt
```

### Logout

```bash
curl -X POST http://localhost:8000/api/session/logout \
  -b cookies.txt
```

## Step 6: Test Secrets Management (via Web UI)

1. Open http://localhost:3000 in your browser
2. Login with your credentials
3. Create a secret:
   - Click "New Secret"
   - Fill in name, type, value
   - Save
4. View the secret list
5. Edit/delete a secret

## Step 7: Test Token Management

### Create Token via API

```bash
curl -X POST http://localhost:8000/api/tokens \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Test Agent Token",
    "expires_at_days": 30
  }'
```

**Important**: Save the returned `key` value - it won't be shown again!

Expected response:
```json
{
  "id": "...",
  "name": "Test Agent Token",
  "key": "vg_...",  // Save this!
  "key_prefix": "vg_abc...",
  "status": "active",
  "expires_at": "2026-07-04T00:00:00Z"
}
```

### List Tokens

```bash
curl http://localhost:8000/api/tokens \
  -b cookies.txt
```

## Step 8: Test Agent Access (Bearer Token)

Using the token key from Step 7:

### List Accessible Secrets

```bash
curl http://localhost:8000/api/vault \
  -H "Authorization: Bearer YOUR_TOKEN_KEY"
```

### Get Secret with Field Filtering

```bash
# Get only URL and value
curl "http://localhost:8000/api/vault/SECRET_ID?fields=url,value" \
  -H "Authorization: Bearer YOUR_TOKEN_KEY"

# Get only value (most efficient)
curl http://localhost:8000/api/vault/SECRET_ID/value \
  -H "Authorization: Bearer YOUR_TOKEN_KEY"
```

## Step 9: Test Scopes

### Create Scope

```bash
curl -X POST http://localhost:8000/api/tokens/TOKEN_ID/scopes \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "secret_ids": ["SECRET_ID"]
  }'
```

### List Scopes

```bash
curl http://localhost:8000/api/tokens/TOKEN_ID/scopes \
  -b cookies.txt
```

### Delete Scope

```bash
curl -X DELETE http://localhost:8000/api/tokens/TOKEN_ID/scopes/SECRET_ID \
  -b cookies.txt
```

## Step 10: Verify Audit Logs

```bash
curl "http://localhost:8000/api/audit-logs?limit=10" \
  -b cookies.txt
```

## Troubleshooting

### Migration Issues

If Alembic migration fails:

```bash
# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d --build

# Or manually run migration
docker compose exec api alembic upgrade head
```

### Permission Denied (403)

Check that:
1. Token exists and status is "active"
2. Token is not expired
3. Token has scopes for the requested secret
4. Secret exists

### CORS Errors

Check `CORS_ALLOWED_ORIGINS` in `.env` includes your frontend URL.

## Production Deployment Checklist

- [ ] Generate strong `ENCRYPTION_KEY` and `SESSION_SECRET`
- [ ] Use PostgreSQL (not SQLite)
- [ ] Enable HTTPS and set `SESSION_SECURE=true`
- [ ] Set `APP_ENV=production`
- [ ] Restrict `CORS_ALLOWED_ORIGINS`
- [ ] Configure database backups
- [ ] Set up monitoring/health checks
- [ ] Use managed database service
- [ ] Configure log aggregation
- [ ] Document incident response process

## API Endpoint Summary

### Public (No Auth)
- `GET /healthz` - Health check
- `GET /version` - Version info
- `GET /docs` - Swagger UI
- `GET /openapi.json` - OpenAPI schema
- `POST /api/bootstrap/init` - Create first user

### Session Auth (Web UI)
- `POST /api/session/login` - Login
- `POST /api/session/logout` - Logout
- `GET /api/session/me` - Current user
- `GET|POST|PATCH|DELETE /api/secrets` - Secret CRUD
- `GET /api/tokens` - List tokens
- `POST /api/tokens` - Create token
- `DELETE /api/tokens/:id` - Revoke token
- `GET /api/tokens/:id/scopes` - List scopes
- `POST /api/tokens/:id/scopes` - Add scopes
- `DELETE /api/tokens/:id/scopes/:secret_id` - Remove scope
- `GET /api/audit-logs` - Audit logs

### Bearer Token (Agents)
- `GET /api/me` - Verify token
- `GET /api/vault` - List accessible secrets
- `GET /api/vault/:id` - Get secret with field filtering
- `GET /api/vault/:id/value` - Get only secret value
- `POST /api/vault/batch` - Batch get with field filtering

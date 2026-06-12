# Deployment Manual

## Scope

This manual covers deploying VaultGate in production.

## Prerequisites

- Docker and Docker Compose v2+
- A domain name with DNS configured (for production with TLS)
- PostgreSQL 16 (or use the bundled Docker Compose service)

## Quick Start (Development)

```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d --build
```

- Web UI: `http://localhost:3000`
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

## Production Deployment

### 1. Prepare Environment

```bash
cp .env.production.example .env.production
# Edit .env.production with strong values:
# - ENCRYPTION_KEY: generate with `python3 -c "import secrets,base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"`
# - SESSION_SECRET: generate with `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
# - POSTGRES_PASSWORD: strong password
# - PUBLIC_HOST: your domain
# - ACME_EMAIL: your email for Let's Encrypt
```

### 2. Build and Deploy

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### 3. Initialize

After the stack is healthy, create the first user:

```bash
curl -X POST https://YOUR_DOMAIN/api/bootstrap/init \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "YourStr0ng!Pass"}'
```

### 4. Verify

```bash
./scripts/ops/smoke-test.sh
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | 32-byte base64-encoded AES-256 key |
| `SESSION_SECRET` | Yes | Secret for signing session cookies |
| `POSTGRES_PASSWORD` | Yes | Database password |
| `PUBLIC_HOST` | Yes (prod) | Domain name |
| `ACME_EMAIL` | Yes (prod) | Email for Let's Encrypt |
| `CORS_ALLOWED_ORIGINS` | Yes (prod) | Comma-separated allowed origins |
| `SESSION_SECURE` | Yes (prod) | Set to `true` for HTTPS |

## Upgrading

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart with zero downtime
docker compose -f docker-compose.prod.yml up -d

# Verify
./scripts/ops/smoke-test.sh
```

## Backup

```bash
./scripts/ops/backup-postgres.sh
```

Backups are saved to `./backups/postgres/` with timestamps.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API won't start | Check `ENCRYPTION_KEY` is valid base64 32-byte key |
| Session cookie not set | Ensure `SESSION_SECURE=true` matches your HTTPS setup |
| Migration fails | Check database connectivity and `DATABASE_URL` |
| CORS errors | Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL |

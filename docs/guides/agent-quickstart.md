# VaultGate Agent Quickstart

This guide is for agents and scripts that need to retrieve secrets from VaultGate using Bearer token authentication.

## Overview

VaultGate is a secrets management service. Agents authenticate with Bearer tokens and can:
- List accessible secrets (metadata only)
- Get a specific secret's metadata
- Get a secret's decrypted value
- Batch-fetch multiple secrets in one request

## Prerequisites

- A VaultGate instance running (see `deployment-manual.md`)
- A Bearer token created by an admin via the web UI or API
- The token must have scopes granting access to the secrets you need

## Authentication

All vault API requests require a Bearer token in the `Authorization` header:

```bash
curl -sS \
  -H "Authorization: Bearer vg_your_token_here" \
  http://localhost:8000/api/vault/secrets
```

Tokens are prefixed with `vg_` and contain 512 bits of entropy. They are shown only once at creation time — store them securely.

## API Endpoints

### List Secrets

Returns metadata for all secrets the token has access to (no values).

```bash
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/vault/secrets
```

Response:
```json
{
  "items": [
    {
      "id": "secret-uuid",
      "name": "OpenAI API Key",
      "type": "api_key",
      "url": "https://api.openai.com",
      "tags": ["production", "ai"],
      "created_at": "2026-06-10T12:00:00Z"
    }
  ]
}
```

### Get Secret Metadata

```bash
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/vault/secrets/$SECRET_ID
```

### Get Secret Value

Returns the decrypted secret value. Only works if the token has an allowed scope for this secret.

```bash
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/vault/secrets/$SECRET_ID/value
```

Response:
```json
{
  "value": "sk-live-abc123..."
}
```

### Batch Get Secrets

Fetch multiple secrets in one request. Returns both results and denials.

```bash
curl -sS \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {"secret_id": "id-1", "fields": ["name", "value"]},
      {"secret_id": "id-2", "fields": ["name", "type", "url"]}
    ]
  }' \
  http://localhost:8000/api/vault/batch
```

Response:
```json
{
  "results": [
    {"secret_id": "id-1", "name": "OpenAI Key", "value": "sk-..."},
    {"secret_id": "id-2", "name": "GitHub Token", "type": "bearer_token", "url": "https://github.com"}
  ],
  "denied": []
}
```

Available fields: `name`, `type`, `url`, `username`, `value`, `tags`, `metadata`, `created_at`, `updated_at`

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 401 | Missing or invalid token | Check token format and validity |
| 403 | Token doesn't have scope for this secret | Request scope grant from admin |
| 404 | Secret not found (or no scope — returns 403) | Check secret ID |
| 422 | Invalid request body | Fix JSON schema |
| 429 | Rate limited | Wait and retry |

## Rate Limiting

- Login endpoint: 5 attempts per 5 minutes per IP
- Vault API: No rate limiting (token auth is sufficient)

## Token Management

Tokens are managed by admins via the web UI at `/tokens` or via the API:

```bash
# Create token (requires session cookie auth)
curl -sS \
  -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"name": "CI Pipeline", "expires_at_days": 90}' \
  http://localhost:8000/api/tokens

# Grant scope (requires session cookie auth)
curl -sS \
  -X POST \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"secret_ids": ["secret-id-1", "secret-id-2"]}' \
  http://localhost:8000/api/tokens/$TOKEN_ID/scopes
```

## Python Example

```python
import requests

VAULTGATE_URL = "http://localhost:8000"
TOKEN = "vg_your_token_here"

headers = {"Authorization": f"Bearer {TOKEN}"}

# List secrets
secrets = requests.get(f"{VAULTGATE_URL}/api/vault/secrets", headers=headers).json()
for secret in secrets["items"]:
    print(f"{secret['name']} ({secret['type']})")

# Get a specific secret value
secret_id = secrets["items"][0]["id"]
value = requests.get(
    f"{VAULTGATE_URL}/api/vault/secrets/{secret_id}/value",
    headers=headers
).json()
print(f"Value: {value['value']}")
```

## OpenAPI Documentation

Full API schema is available at:
- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

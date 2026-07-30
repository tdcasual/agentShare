# Agent Quickstart

An Agent uses a `vg_` Token. The administrator creates the Agent, issues its Token, and either grants individual Secrets or assigns the Token to a shared Space.

## In the console

The in-app `/docs` page condenses the flow into three steps — create a Secret, issue and grant a Token, call the Runtime API. The full administrator path in the UI:

1. Open **Agents** in the navigation (`/agents`) and select an Agent to open its detail page.
2. Click **Issue Token** to create a `vg_` Token; the plaintext is shown once. Issuing is blocked while the grant panel has unsaved changes.
3. In the grant panel, tick the Secrets the Token may read, then click **Save access** — ticking boxes alone applies nothing.
4. `vgm_` management Tokens for administrator automation live under **Management Tokens** (`/settings/management-tokens`).
5. Open **Spaces** (`/spaces`) to create a shared Space and assign Agent Tokens. Membership changes apply immediately; archived Spaces are no longer visible to Agents.

Keep Tokens out of source code and logs:

```bash
export VAULTGATE_URL=https://vaultgate.example.com
export VAULTGATE_TOKEN=vg_replace_me
```

Verify the credential:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  "$VAULTGATE_URL/api/vault/me"
```

List visible Secrets. Missing grants simply make a Secret absent:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  "$VAULTGATE_URL/api/vault/secrets"
```

Discover Spaces and list a particular Space:

```bash
curl --fail-with-body -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  "$VAULTGATE_URL/api/vault/spaces"

curl --fail-with-body -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  "$VAULTGATE_URL/api/vault/secrets?space_id=$SPACE_ID"
```

Agents with the `contributor` or `maintainer` role can publish a credential to a
Space. Every write must include an idempotency key so a retry cannot create a
duplicate credential:

```bash
curl --fail-with-body -X POST \
  -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: deploy-account-2026-07-30" \
  "$VAULTGATE_URL/api/vault/spaces/$SPACE_ID/secrets" \
  -d '{"name":"deploy-account","type":"password","username":"deploy","value":"replace-me"}'
```

The response contains metadata and a `version`, but never the plaintext value.
Use the value endpoint when a read is explicitly required. To update a Secret,
send its current version in `If-Match`; a stale version returns `409` and must be
refetched before retrying:

```bash
curl --fail-with-body -X PATCH \
  -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  -H "Content-Type: application/json" \
  -H "If-Match: 1" \
  "$VAULTGATE_URL/api/vault/secrets/$SECRET_ID" \
  -d '{"value":"rotated-value"}'
```

Read metadata:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  "$VAULTGATE_URL/api/vault/secrets/$SECRET_ID"
```

Read the value:

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $VAULTGATE_TOKEN" \
  "$VAULTGATE_URL/api/vault/secrets/$SECRET_ID/value"
```

Value responses use `Cache-Control: no-store`. A valid Token without a grant receives `403`; expired, revoked, malformed, or disabled-Agent credentials receive `401`.

Python example:

```python
import os
import requests

base_url = os.environ["VAULTGATE_URL"]
headers = {"Authorization": f"Bearer {os.environ['VAULTGATE_TOKEN']}"}

secrets = requests.get(f"{base_url}/api/vault/secrets", headers=headers, timeout=15)
secrets.raise_for_status()

secret_id = secrets.json()["items"][0]["id"]
value = requests.get(
    f"{base_url}/api/vault/secrets/{secret_id}/value",
    headers=headers,
    timeout=15,
)
value.raise_for_status()
print(value.json()["value"])
```

Administrator automation must use a separate `vgm_` Token with `/api/admin/*`; a management Token is never accepted by `/api/vault/*`. Agents cannot change Space membership, move Secrets between Spaces, delete Secrets, or grant themselves access.

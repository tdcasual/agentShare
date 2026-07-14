# Agent Quickstart

An Agent uses a `vg_` Token. The administrator creates the Agent, issues its Token, and explicitly selects the Secrets visible to that Token.

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

Administrator automation must use a separate `vgm_` Token with `/api/admin/*`; a management Token is never accepted by `/api/vault/*`.

# Agent Onboarding Protocol v1

VaultGate Agent onboarding lets an administrator issue a short-lived, one-time invite without placing a long-lived `vg_` token in a prompt.

## Flow

1. The administrator creates an invite in the control plane and selects an optional Space and role.
2. VaultGate returns a one-time `vgi_` invite code. Store it as a secret and share it only with the intended Agent.
3. The Agent submits the code to `POST /api/onboarding/v1/requests` with an `Idempotency-Key`.
4. The Agent polls the request using the returned `vgi_` request secret.
5. The administrator approves or rejects the request.
6. After approval, the Agent claims its initial `vg_` token using the same request secret and a new `Idempotency-Key`.

The token is encrypted at rest and returned only through the claim endpoint. Reusing the same claim key is safe; a different key after a successful claim is rejected.

The public submit endpoint is limited to 20 attempts per client IP in a rolling five-minute window. Attempts are persisted as audit events, so the limit applies across API processes. Invalid or expired invite codes return the same `404` response and do not reveal whether an invite exists.

## Submit a request

```http
POST /api/onboarding/v1/requests
Idempotency-Key: request-unique-value
Content-Type: application/json

{"invite_code":"vgi_...","agent_name":"deploy-agent","description":"Production deployer"}
```

The response contains `request_id` and a `request_secret`. Do not log either credential.

## Poll and claim

```http
GET /api/onboarding/v1/requests/{request_id}
Authorization: Bearer vgi_...
```

```http
POST /api/onboarding/v1/requests/{request_id}/credential
Authorization: Bearer vgi_...
Idempotency-Key: claim-unique-value
```

The claim response contains the initial `vg_` token once. The token is scoped to the administrator's selected Space membership, if any.

`vgi_` credentials are onboarding-only. They are rejected by both `/api/admin/*` and `/api/vault/*` authentication.

An invite's optional Space and role define the initial token's visibility. In this version, “public” means visible to active members of that Space; it does not mean globally visible to every Agent.

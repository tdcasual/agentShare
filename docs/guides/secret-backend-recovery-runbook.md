# Secret Backend Recovery Runbook

This runbook supports `P3.3 Secret Lifecycle Hardening`.

## Purpose

Provide the repository-side response flow when the external secret backend is unavailable or suspected compromised.

## Incident Types

- backend unreachable
- credential rejected
- mount or namespace misconfiguration
- suspected credential compromise

## Recovery Flow

1. Confirm whether the issue is reachability, policy, or compromise.
2. Engage platform owner immediately.
3. Engage security owner immediately if compromise is suspected.
4. Use the scoped app credential recovery path, not ad hoc root access.
5. Restore backend reachability or issue a replacement credential.
6. Redeploy the app if credential material changes.
7. Validate secret-backed flows and document the outcome.

## Do Not Do

- do not bypass the scoped credential model with undocumented root access
- do not call the incident closed until app validation succeeds

## Evidence To Record

- detection source
- owners engaged
- recovery path used
- validation result
- follow-up tasks

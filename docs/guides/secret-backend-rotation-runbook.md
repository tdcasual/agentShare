# Secret Backend Rotation Runbook

This runbook supports `P3.3 Secret Lifecycle Hardening`.

## Purpose

Rotate the application's production secret-backend credential without emergency-only procedures or code changes.

## Preconditions

- platform owner controls secret backend issuance
- security owner has reviewed the credential model
- application uses a scoped credential rather than root-level access

## Rotation Steps

1. Issue a new scoped application credential in the secret backend.
2. Store the new credential through the production secret-distribution path.
3. Redeploy the application so the new credential is loaded.
4. Verify:
   - app boot
   - health endpoint
   - secret-backed capability access
5. Revoke the old credential after validation passes.
6. Record rotation time, owners, and outcome.

## Rollback

If validation fails:

1. restore the previous credential
2. redeploy the app
3. confirm health and secret-backed flows recover

## Completion Evidence

- rotation timestamp
- credential scope description
- app validation result
- old credential revocation status

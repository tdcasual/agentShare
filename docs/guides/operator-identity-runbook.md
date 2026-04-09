# Operator Identity Runbook

This runbook prepares `P3.5 Operator Identity Modernization`.

## Purpose

Define the repository-side expectations for moving from local bootstrap-oriented operator login to managed operator identity.

## Target Outcome

- operators authenticate through managed identity
- local bootstrap-oriented access becomes break-glass only
- offboarding is possible outside the app database alone

## Required Decisions

- identity provider
- role mapping model
- break-glass process
- offboarding owner
- audit expectations

## Migration Checklist

1. Define identity provider and owner.
2. Define role mapping from external identity to local authorization model.
3. Define break-glass path.
4. Define offboarding and session revocation path.
5. Validate login, logout, and role enforcement in staging.

## Do Not Proceed

Do not cut production over if:

- break-glass access is undocumented
- offboarding is ownerless
- role mapping is not tested

## Completion Evidence

- staging validation notes
- owner sign-off
- rollback path

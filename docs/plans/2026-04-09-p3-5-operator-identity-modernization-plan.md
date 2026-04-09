# P3.5 Operator Identity Modernization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current bootstrap-oriented local operator login path with a managed operator identity model while preserving the existing authorization roles and audit behavior.

**Architecture:** Keep local authorization semantics (`viewer`, `operator`, `admin`, `owner`) but move primary operator authentication behind an external identity provider. The application should map external identities into local roles and keep a documented break-glass path for emergencies.

**Tech Stack:** FastAPI session/auth stack, Next.js management UI, managed identity provider, server-side session issuance, audit events.

---

## Preconditions

- `P3.0 Ownership And Readiness` complete
- application owner, platform owner, and security owner named
- identity provider selected
- break-glass governance approved

## Scope

This plan covers:

- external operator authentication
- role mapping
- break-glass path
- offboarding expectations
- rollback path

This plan does not cover:

- end-user SSO beyond operator access
- arbitrary RBAC redesign
- replacing the current audit model

## Repository Touchpoints

- `apps/api/app/auth/*`
- `apps/api/app/routes/sessions.py`
- `apps/api/app/config.py`
- `apps/control-plane-v3/src/domains/identity/*`
- `apps/control-plane-v3/src/lib/session.ts`
- `apps/control-plane-v3/src/app/login/*`
- `docs/guides/operator-identity-runbook.md`
- `docs/guides/production-security.md`

## Milestone Tasks

### Task 1: Identity Provider Decision

- choose provider and ownership model
- define trust boundary
- define required claims

### Task 2: Role Mapping Design

- map provider identities to `viewer`, `operator`, `admin`, `owner`
- define what remains local
- define what must be externally enforced

### Task 3: Break-Glass Design

- define who may use local-only emergency access
- define when break-glass is allowed
- define audit expectations

### Task 4: Session Integration

- update auth flow to accept external identity
- preserve server-side session issuance
- preserve audit traceability

### Task 5: UI And Operator Flow

- update login UX for managed identity
- update failure handling and session recovery
- preserve clear operator-facing auth states

### Task 6: Validation And Rollback

- stage the integration
- test role enforcement
- test offboarding and session revocation
- document rollback to local-only auth if rollout fails

## Validation Checklist

- operator login works through the managed identity provider
- existing role checks still behave correctly
- audit events still identify actor and session clearly
- break-glass path is documented and restricted
- rollback to previous auth mode is possible

## Exit Criteria

- managed identity is the primary operator auth path
- break-glass path exists and is owner-governed
- offboarding no longer depends only on the local app database

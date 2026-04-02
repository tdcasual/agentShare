# Operator Identity And Policy Design

**Date:** 2026-04-02

**Goal:** Define a durable identity, authorization, and policy model for human operators and runtime actors so the control plane can enforce permissions consistently, support future SSO, and preserve clean audit semantics.

**Design status:** Proposed domain design aligned to the architecture baseline in `2026-04-02-control-plane-architecture-design.md`.

---

## 1. Why This Design Exists

The repository already has working management sessions, human roles, route guards, and an operator identity provider seam. That is enough to run the product, but not enough to call the authorization model complete.

Today, the system still mixes three separate ideas:

- identity: who is acting
- authorization: whether that actor may perform an action
- governance policy: whether the action is allowed, denied, or requires review under product rules

Those concerns are related, but they are not the same concern.

This design separates them cleanly so later work can stay additive:

- SSO can replace local authentication without changing policy semantics
- route guards can collapse into one service-layer action vocabulary
- audit can record decisions in a stable format
- reviews and runtime actions can depend on the same permission language

---

## 2. Design Objectives

This design must satisfy the following objectives.

### 2.1 Stable human identity model

Human operator identity must remain stable even if the authentication provider changes from local credentials to enterprise SSO.

### 2.2 Explicit action-based authorization

Permission checks must eventually answer one question:

`may actor X perform action Y on resource Z in context C?`

Not:

`is this route behind admin or owner?`

### 2.3 Clear separation between operator auth and governance policy

Human operators need permissions to inspect and govern.
Runtime actions need policy evaluation for task, capability, and risk controls.

Those two layers must interoperate, but they should not be collapsed into one undifferentiated boolean check.

### 2.4 Future-proof provider seam

Local email/password is a valid current default.
It must not leak into the long-term business model as the only representation of operator identity.

### 2.5 Auditability by design

Every high-trust action must be attributable to:

- a normalized actor
- a specific session or runtime credential when applicable
- an action name
- a target resource
- an authorization result
- a governance result where relevant

---

## 3. Current State Summary

The repository already implements a useful baseline:

- human management roles: `viewer`, `operator`, `admin`, `owner`
- persisted human accounts
- session-based management auth
- provider seam via `operator_identity_provider`
- basic route-level role gates
- runtime actor support for agent or human on some endpoints

The current weaknesses are:

- route guards are still the main authorization language
- actions are not modeled as first-class policy objects
- `reviews` still depend on a direct `admin` route guard even though product semantics point toward a more explicit operator-governance model
- the runtime policy engine and management authorization language are still separate conceptual systems
- audit payloads are not yet standardized around action/resource semantics

This design addresses those weaknesses without invalidating current behavior.

---

## 4. Identity Model

Identity answers the question:

`who is acting?`

It does not answer whether the action is allowed.

### 4.1 Actor categories

The system recognizes two primary actor categories:

- `human`
- `agent`

Future expansion such as service principals or external automation users should still fit under the same normalized actor contract.

### 4.2 Human operator identity

Human operators are durable management principals with stable application-level identities.

Recommended canonical fields:

- `actor_type = "human"`
- `actor_id`
- `email`
- `display_name`
- `role`
- `status`
- `identity_provider`
- `provider_subject`

Rules:

- `actor_id` is the app-owned durable identifier
- `provider_subject` is the upstream identity subject when external auth exists
- changing auth providers must not require changing `actor_id`

### 4.3 Agent runtime identity

Agents are machine principals that act through runtime credentials.

Recommended canonical fields:

- `actor_type = "agent"`
- `actor_id`
- `token_id`
- `auth_method`
- `risk_tier`
- `labels`
- `status`

Rules:

- `actor_id` identifies the agent principal
- `token_id` identifies the concrete runtime credential when present
- token-scoped actions should preserve both agent and token attribution

### 4.4 Session identity

Human interaction with management surfaces should always resolve to a normalized management session identity:

- `actor_type`
- `actor_id`
- `role`
- `auth_method`
- `session_id`
- `issued_at`
- `expires_at`

This contract is correct and should remain stable even after SSO lands.

---

## 5. Authentication Model

Authentication answers:

`can we prove who this actor is?`

### 5.1 Human authentication providers

The design keeps a provider-based contract:

- current provider: `local`
- future provider: `sso`
- optional future providers: `oidc`, `saml`, `scim-backed local mirror`

The provider contract should stay minimal:

- authenticate incoming credentials or exchange result
- resolve an external subject to an internal human account
- return a normalized operator principal

The provider should not own session issuance, cookie policy, or audit semantics.

### 5.2 Local provider

Local email/password remains valid for:

- development
- internal testing
- supervised trial runs
- bootstrap phases before enterprise identity is wired

It should be treated as an implementation, not as the architecture.

### 5.3 Future SSO provider

The future SSO provider must plug into the same application-level identity contract.

That means:

- the app still owns human account records
- the app still owns roles
- the app still owns sessions
- the upstream provider proves identity, but the app decides access

This is important because it preserves local authorization and audit semantics even when the identity source changes.

---

## 6. Authorization Model

Authorization answers:

`may this actor perform this management action on this resource?`

This design adopts action-based authorization.

### 6.1 Core permission tuple

All authorization should normalize to this shape:

- `actor`
- `action`
- `resource_type`
- `resource_id`
- `context`

Where:

- `actor` is a normalized human or agent principal
- `action` is a stable namespaced action string
- `resource_type` identifies the protected object class
- `resource_id` is optional for list/create actions
- `context` carries supporting facts such as environment, task type, or ownership

### 6.2 Action naming convention

Use namespaced verbs:

- `admin_accounts:list`
- `admin_accounts:create`
- `admin_accounts:disable`
- `agents:list`
- `agents:create`
- `agents:delete`
- `agent_tokens:list`
- `agent_tokens:issue`
- `agent_tokens:revoke`
- `reviews:list`
- `reviews:decide`
- `resources:list`
- `resources:create`
- `tasks:create`
- `tasks:list`
- `tasks:claim`
- `tasks:complete`
- `catalog:list`
- `spaces:list`
- `spaces:create`
- `spaces:update`

This vocabulary should be shared by:

- route enforcement
- policy checks
- audit payloads
- docs
- tests

### 6.3 Resource taxonomy

Recommended protected resource types:

- `admin_account`
- `human_account`
- `agent`
- `agent_token`
- `secret`
- `capability`
- `task`
- `task_target`
- `review_item`
- `catalog_release`
- `space`
- `event`
- `session`

---

## 7. Role Model

Roles remain useful, but they must become inputs to the policy engine rather than the whole policy model.

### 7.1 Current role ladder

The system should preserve the current ordered role set:

- `viewer`
- `operator`
- `admin`
- `owner`

This keeps current repository behavior compatible with future refinement.

### 7.2 Role intent

#### Viewer

Read-only operational visibility.

Intended for:

- inventory inspection
- workflow visibility
- dashboard, search, and event reading

Not intended for:

- governance decisions
- account mutation
- secret or agent mutation

#### Operator

Active operational supervisor.

Intended for:

- review queue inspection
- governance decision execution
- runtime workflow inspection
- task publication where product semantics consider it operational rather than administrative

Not intended for:

- human account lifecycle
- agent inventory mutation
- secret creation or destructive trust actions

#### Admin

Administrative manager for system inventory and controlled mutation.

Intended for:

- secret inventory management
- capability inventory management
- agent creation and token issuance
- non-owner human account management where allowed

Not intended for:

- irreversible platform ownership actions
- owner-level break-glass powers

#### Owner

Top-level governance and break-glass administrator.

Intended for:

- bootstrap ownership
- deleting agent identities
- managing highest-trust operator lifecycle actions
- policy and trust-boundary exceptions

### 7.3 Role rules

- Roles are application roles, not provider roles
- Upstream SSO groups may map into them, but may not replace them
- Role ordering is allowed, but role checks should gradually move behind action checks

---

## 8. Recommended Operator Action Matrix

This matrix is the proposed baseline for human operator actions inside the repository boundary.

| Action | Viewer | Operator | Admin | Owner |
| --- | --- | --- | --- | --- |
| `sessions:inspect_self` | allow | allow | allow | allow |
| `events:list` | allow | allow | allow | allow |
| `search:query` | allow | allow | allow | allow |
| `catalog:list` | allow | allow | allow | allow |
| `tasks:list` | allow | allow | allow | allow |
| `reviews:list` | deny | allow | allow | allow |
| `reviews:decide` | deny | allow | allow | allow |
| `tasks:create` | deny | allow | allow | allow |
| `spaces:list` | allow | allow | allow | allow |
| `spaces:create` | deny | allow | allow | allow |
| `spaces:update` | deny | allow | allow | allow |
| `resources:list` | allow | allow | allow | allow |
| `secrets:create` | deny | deny | allow | allow |
| `capabilities:create` | deny | deny | allow | allow |
| `agents:list` | deny | deny | allow | allow |
| `agents:create` | deny | deny | allow | allow |
| `agents:delete` | deny | deny | deny | allow |
| `agent_tokens:list` | deny | deny | allow | allow |
| `agent_tokens:issue` | deny | deny | allow | allow |
| `agent_tokens:revoke` | deny | deny | allow | allow |
| `admin_accounts:list` | deny | deny | allow | allow |
| `admin_accounts:create` | deny | deny | allow | allow |
| `admin_accounts:disable` | deny | deny | allow with constraint | allow |
| `policies:manage` | deny | deny | deny by default | allow |

Constraint notes:

- `admin_accounts:disable` by `admin` must not disable an owner
- `owner` remains the only actor allowed to perform destructive break-glass actions such as deleting agents
- if product semantics later decide `tasks:create` is administrative instead of operational, move it to `admin+`, but keep the action name stable

This matrix should be documented separately as operator-facing reference once implemented.

---

## 9. Runtime Policy Model

Runtime policy is related to authorization, but distinct from human operator permissions.

It answers:

`should this task/capability/runtime action be allowed, denied, or held for review?`

### 9.1 Separation of concerns

Use two layers:

- operator authorization layer
- runtime governance policy layer

Operator authorization decides whether a human may inspect or govern.
Runtime governance policy decides whether an action requested by an agent may proceed.

### 9.2 Runtime policy inputs

Runtime policy may consider:

- task approval mode
- capability approval mode
- explicit task policy rules
- explicit capability policy rules
- action type
- provider
- environment
- task type
- risk level

This is already close to the current `policy_service` shape and should remain so.

### 9.3 Joining operator permissions with runtime policy

The join point is human governance.

Example:

1. Runtime policy returns `manual`
2. Review item is created or resolved
3. Human operator must have `reviews:decide`
4. Audit records both the runtime policy result and the human governance decision

This keeps operator permission and runtime policy distinct but coordinated.

---

## 10. Decision Engine Design

The recommended architecture is a small explicit authorization engine for management actions.

### 10.1 Proposed service contract

Introduce a service-layer contract shaped like:

`authorize_management_action(actor, action, resource=None, context=None) -> AuthorizationOutcome`

Recommended outcome fields:

- `allowed: bool`
- `action`
- `actor_id`
- `actor_type`
- `role`
- `resource_type`
- `resource_id`
- `reason`
- `policy_source`

This contract should be pure enough for unit testing and reusable across route dependencies.

### 10.2 Route integration model

Routes should gradually shift from:

- `require_admin_management_session`
- `require_owner_management_session`

to:

- require authenticated management session
- call shared action authorizer with explicit action name

This avoids hiding business authorization inside dependency naming.

### 10.3 Context-aware constraints

The authorization engine must support constraints that simple role ladders cannot express.

Examples:

- admin may disable non-owner accounts only
- operator may decide review items but not mint tokens
- owner-only actions may require stronger audit expectations

This is the main reason to move beyond route-scattered role thresholds.

---

## 11. Session Model Requirements

The current session model is directionally correct and should be preserved with a few explicit rules.

### 11.1 Session properties

Management sessions must remain:

- short-lived
- server-revocable
- persisted
- role-bearing
- correlated to audit

### 11.2 Session invariants

The application must reject a session when:

- token signature is invalid
- persisted session record is missing
- session was revoked
- session expired
- account is inactive
- account role no longer matches the session payload

These invariants are already present and should become part of the formal design contract.

### 11.3 Session evolution rule

Future SSO login flows may change how a session starts, but not how the application validates and uses the resulting management session.

---

## 12. Audit Requirements Tied To Identity And Policy

Authorization and identity only become trustworthy when audit preserves their outputs.

### 12.1 Required audit fields for management actions

Every high-trust management action should record:

- `actor_type`
- `actor_id`
- `session_id`
- `role`
- `action`
- `resource_type`
- `resource_id`
- `authorization_result`
- `authorization_reason`
- `decision_result` when separate from authorization
- `request_id` when available

### 12.2 Required audit fields for runtime-governed actions

When runtime policy is involved, also record:

- `token_id`
- `task_id`
- `capability_id`
- `policy_decision`
- `policy_source`
- `policy_reason`
- `review_required`
- `review_decision` when resolved

### 12.3 Rejection events

Rejected logins and denied actions matter as much as successful ones.
They should remain first-class audit events.

---

## 13. API And Dependency Design Rules

### 13.1 Authentication dependencies

Keep lightweight dependencies for:

- authenticated management session
- authenticated agent runtime
- mixed management-or-agent endpoints where product semantics require both

### 13.2 Authorization in services

Do not embed non-trivial business authorization directly in route decorators or route-local `if` statements.

Instead:

- authenticate in dependencies
- authorize in shared service logic
- return normalized errors
- emit audit events from one consistent location or contract

### 13.3 Error semantics

Use clear distinction:

- `401` when identity is missing or invalid
- `403` when identity is valid but not allowed
- `409` when business state blocks the action, such as bootstrap not completed or review required

---

## 14. Migration Strategy

This design should be implemented incrementally, not as a rewrite.

### 14.1 Phase 1: Document and normalize actions

- define stable action names
- add a dedicated operator policy matrix document
- map current routes to action names
- preserve current behavior where needed

### 14.2 Phase 2: Introduce shared authorizer

- add `authorize_management_action`
- convert selected routes from role-threshold checks to action checks
- start with highest-value management routes:
  - reviews
  - admin accounts
  - agents
  - agent tokens

### 14.3 Phase 3: Align audit payloads

- standardize audit payload fields
- add action/resource identifiers to high-trust events
- ensure rejected and successful paths use the same vocabulary

### 14.4 Phase 4: Add future provider support

- expand `operator_identity_provider` beyond `local`
- map external identities into app-owned human accounts
- keep role and session semantics unchanged

---

## 15. Testing Strategy

This design requires tests at four layers.

### 15.1 Identity provider tests

Prove:

- provider selection is config-driven
- local provider remains default
- session auth delegates to provider contract

### 15.2 Authorization matrix tests

Prove:

- each role can and cannot perform the documented actions
- contextual constraints behave correctly
- owner-only actions remain owner-only

### 15.3 Route contract tests

Prove:

- routes return the correct status code for unauthorized versus forbidden
- action enforcement matches matrix intent

### 15.4 Audit tests

Prove:

- successful and denied high-trust actions emit durable, normalized audit payloads
- session identifiers and actor details are preserved

---

## 16. Decisions Locked By This Design

- Human operator identity is application-owned even when authentication is provider-backed.
- Roles remain app roles and are not delegated to the upstream auth provider.
- Authorization should converge on action-based service checks.
- Runtime governance policy remains a separate layer from operator permission checks.
- Review decisions belong to `operator+`, not implicitly `admin+`, unless a later ADR intentionally changes product semantics.
- Session semantics stay stable across auth-provider changes.

---

## 17. Follow-On Work Triggered By This Design

After this design, the next dependent designs should be:

- audit and governance event schema design
- operator policy matrix implementation plan
- review decision and trust-action audit hardening
- SSO handoff design

These should all reuse the identity, action, and authorization vocabulary established here.

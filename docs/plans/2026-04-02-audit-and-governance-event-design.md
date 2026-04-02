# Audit And Governance Event Design

**Date:** 2026-04-02

**Goal:** Define a unified event model for audit, governance, and operator trust actions so the control plane can produce durable, queryable, and semantically consistent records across management, review, runtime, and session flows.

**Design status:** Proposed domain design aligned to the architecture and operator identity/policy baselines.

---

## 1. Why This Design Exists

The repository already records audit events and operational inbox events, which is a strong start. The problem is not the absence of recording. The problem is that recording is still too generic.

Today, the system can say that something happened.
It is not yet consistently able to say:

- who acted
- through which session or token
- against which resource
- under which action name
- with which authorization or governance result
- for which reason
- correlated to which request

That gap matters because the control plane is fundamentally a trust-governed system. Without normalized audit semantics, later work on operator policy, review decisions, token governance, and incident response will stay harder than it needs to be.

This design therefore standardizes the event language.

---

## 2. Event Types In This System

The architecture needs two different event families.

### 2.1 Audit events

Audit events are durable trust records.

They answer:

`what sensitive action happened, who did it, and what was the outcome?`

Examples:

- management login accepted or rejected
- admin account created or disabled
- agent token issued or revoked
- review approved or rejected
- approval requested, approved, or rejected

Audit events are not mainly for UI convenience.
They are for governance, investigation, and accountability.

### 2.2 Operational inbox events

Operational inbox events are operator-facing workflow signals.

They answer:

`what should an operator see, inspect, or respond to?`

Examples:

- task completed
- token expiring
- market publication created
- risk-related notifications

Operational events are projections optimized for actionability.
They may overlap with audit-worthy actions, but they are not the same record.

### 2.3 Rule: do not collapse them into one table conceptually

An action may emit:

- an audit event only
- an inbox event only
- both

But the system should not assume they are interchangeable.

Audit is durable truth.
Inbox is operational projection.

---

## 3. Design Objectives

This design must satisfy six objectives.

### 3.1 Stable vocabulary

All high-trust actions should use the same actor/action/resource/result vocabulary.

### 3.2 End-to-end correlation

Records should connect:

- actor
- session or token
- request
- resource
- governance decision

### 3.3 Support both management and runtime flows

The schema must work for:

- human management actions
- agent runtime actions
- mixed governance flows where an agent triggers a state change and a human resolves it

### 3.4 Separate authorization from business decision

The system must be able to record both:

- authorization outcome
- governance or policy outcome

These are often related, but not always identical.

### 3.5 Additive migration

The design should build on the current generic `audit_event` storage model without requiring a destructive rewrite.

### 3.6 Human-readable investigation

Payloads must remain structured, but understandable enough that an operator or engineer can investigate incidents without reverse-engineering route code.

---

## 4. Core Event Model

Every audit event should adopt a normalized envelope.

### 4.1 Audit envelope

Recommended canonical fields:

- `event_type`
- `event_version`
- `occurred_at`
- `actor`
- `auth_context`
- `action`
- `resource`
- `authorization`
- `governance`
- `request`
- `outcome`
- `metadata`

The event store may still persist this as a JSON payload, but the semantics of those fields should now be stable.

### 4.2 Actor object

Recommended shape:

```json
{
  "actor_type": "human",
  "actor_id": "human_123",
  "role": "operator"
}
```

For agent events:

```json
{
  "actor_type": "agent",
  "actor_id": "agent_123",
  "token_id": "token_123"
}
```

### 4.3 Auth context object

Recommended shape:

```json
{
  "auth_method": "session",
  "session_id": "session_123",
  "identity_provider": "local"
}
```

Or for runtime:

```json
{
  "auth_method": "api_key",
  "token_id": "token_123"
}
```

This object answers how the actor was authenticated in that moment.

### 4.4 Action object

Recommended shape:

```json
{
  "name": "reviews:decide",
  "phase": "decision"
}
```

`name` should use the same stable action vocabulary defined in the operator identity and policy design.

### 4.5 Resource object

Recommended shape:

```json
{
  "resource_type": "review_item",
  "resource_id": "secret_123",
  "parent_resource_type": "secret",
  "parent_resource_id": "secret_123"
}
```

Simple events may only need:

```json
{
  "resource_type": "agent_token",
  "resource_id": "token_123"
}
```

### 4.6 Authorization object

Recommended shape:

```json
{
  "result": "allow",
  "reason": "role operator grants reviews:decide",
  "policy_source": "management_action_matrix"
}
```

This answers whether the actor was allowed to attempt the action.

### 4.7 Governance object

Recommended shape:

```json
{
  "result": "approved",
  "reason": "Operator approved after review",
  "policy_source": "review_queue",
  "review_id": "review_123"
}
```

This answers the business or governance outcome.

### 4.8 Request object

Recommended shape:

```json
{
  "request_id": "req_123",
  "route": "/api/reviews/secret/secret_123/approve",
  "method": "POST"
}
```

### 4.9 Outcome object

Recommended shape:

```json
{
  "status": "success",
  "code": "review_approved"
}
```

Examples of `status`:

- `success`
- `rejected`
- `denied`
- `failed`

---

## 5. Audit Event Taxonomy

The system should use stable audit event families instead of ad hoc names.

### 5.1 Session events

- `management_session.rejected`
- `management_session.started`
- `management_session.ended`
- `management_session.revoked`

### 5.2 Human account events

- `admin_account.created`
- `admin_account.disabled`
- `admin_account.listed`

### 5.3 Agent and token events

- `agent.created`
- `agent.deleted`
- `agent.listed`
- `agent_token.issued`
- `agent_token.revoked`
- `agent_token.listed`

### 5.4 Resource governance events

- `review.queue_listed`
- `review.approved`
- `review.rejected`
- `catalog.listed`

### 5.5 Runtime governance events

- `approval.requested`
- `approval.approved`
- `approval.rejected`
- `task.created`
- `task.claimed`
- `task.completed`
- `task_target.claimed`
- `task_target.completed`

### 5.6 Authorization and policy events

Reserved for future normalized denial capture:

- `authorization.denied`
- `policy.manual_required`
- `policy.denied`

This family matters because denied and manual-gated actions are often the most important trust signals.

---

## 6. Governance Decision Model

The most important part of this design is the explicit governance decision record.

### 6.1 Decision lifecycle

Many sensitive flows involve two steps:

1. a request or pending state is created
2. a human decides

The system must be able to represent both phases distinctly.

### 6.2 Decision-capable event fields

When an action involves review or approval, the audit payload should capture:

- `decision_type`
- `decision_result`
- `decision_reason`
- `decision_by_actor_id`
- `decision_by_session_id`
- `decision_at`

Examples:

- approval requested
- approval approved
- approval rejected
- review approved
- review rejected

### 6.3 Reason is not optional for rejections

When a human rejects an approval or review, `decision_reason` should be mandatory in the business flow and mandatory in the audit record.

Approvals may optionally omit a reason.
Rejections should not.

---

## 7. Audit Event Examples

### 7.1 Review approved

```json
{
  "event_type": "review.approved",
  "event_version": 1,
  "actor": {
    "actor_type": "human",
    "actor_id": "human_operator_1",
    "role": "operator"
  },
  "auth_context": {
    "auth_method": "session",
    "session_id": "session_1",
    "identity_provider": "local"
  },
  "action": {
    "name": "reviews:decide",
    "phase": "decision"
  },
  "resource": {
    "resource_type": "review_item",
    "resource_id": "secret_123",
    "parent_resource_type": "secret",
    "parent_resource_id": "secret_123"
  },
  "authorization": {
    "result": "allow",
    "reason": "role operator grants reviews:decide",
    "policy_source": "management_action_matrix"
  },
  "governance": {
    "result": "approved",
    "reason": "",
    "policy_source": "review_queue"
  },
  "outcome": {
    "status": "success",
    "code": "review_approved"
  }
}
```

### 7.2 Approval rejected

```json
{
  "event_type": "approval.rejected",
  "event_version": 1,
  "actor": {
    "actor_type": "human",
    "actor_id": "human_operator_1",
    "role": "operator"
  },
  "auth_context": {
    "auth_method": "session",
    "session_id": "session_1",
    "identity_provider": "local"
  },
  "action": {
    "name": "reviews:decide",
    "phase": "decision"
  },
  "resource": {
    "resource_type": "approval_request",
    "resource_id": "approval_123"
  },
  "authorization": {
    "result": "allow",
    "reason": "role operator grants reviews:decide",
    "policy_source": "management_action_matrix"
  },
  "governance": {
    "result": "rejected",
    "reason": "Rejected by operator",
    "policy_source": "approval_queue"
  },
  "outcome": {
    "status": "rejected",
    "code": "approval_rejected"
  }
}
```

### 7.3 Management login rejected

```json
{
  "event_type": "management_session.rejected",
  "event_version": 1,
  "actor": {
    "actor_type": "human",
    "actor_id": "owner@example.com"
  },
  "auth_context": {
    "auth_method": "session_login"
  },
  "action": {
    "name": "sessions:login",
    "phase": "authenticate"
  },
  "resource": {
    "resource_type": "session",
    "resource_id": null
  },
  "authorization": {
    "result": "deny",
    "reason": "invalid credentials",
    "policy_source": "operator_identity_provider"
  },
  "outcome": {
    "status": "rejected",
    "code": "management_login_rejected"
  }
}
```

---

## 8. Inbox Event Model Relationship

Audit events and inbox events should cooperate, not duplicate blindly.

### 8.1 When to emit only audit

Emit only audit when:

- the action is primarily for investigation and traceability
- there is no operator workflow to perform
- the event would create noisy UI without operational value

Examples:

- account listed
- catalog listed
- session ended normally

### 8.2 When to emit both

Emit both audit and inbox event when:

- the action is sensitive and also operationally actionable
- a human may need to follow up from the UI

Examples:

- approval requested
- high-risk denial
- token expiring
- resource rejected and requiring remediation

### 8.3 Linking strategy

When both exist, the inbox event metadata should reference the canonical resource and review/approval identifiers.
The audit event remains the durable truth.

---

## 9. Storage Strategy

The current `audit_events` table uses:

- `event_type`
- `payload`

This is a good migration starting point.

### 9.1 Short-term storage plan

Keep the current table structure, but standardize payload semantics immediately.

Add inside payload:

- `event_version`
- normalized envelope fields

### 9.2 Medium-term storage improvements

When audit query complexity grows, consider adding top-level indexed columns such as:

- `occurred_at`
- `actor_type`
- `actor_id`
- `resource_type`
- `resource_id`
- `action_name`
- `outcome_status`
- `session_id`

This would be an optimization, not a prerequisite for semantic correctness.

### 9.3 Versioning rule

Every normalized payload should include `event_version`.

This allows future schema evolution without making old events unreadable.

---

## 10. Emission Rules

### 10.1 Emit at the domain boundary

Audit events should be emitted where the business action is committed, not only at the route layer.

Reason:

- route-layer emission misses non-HTTP entry points
- domain-layer emission is closer to the real state transition

### 10.2 Route layer still contributes context

The route layer is still the right place to attach:

- request id
- path
- method
- current session identity

The recommended approach is to gather route/request context, then pass it into domain-layer emission helpers.

### 10.3 One canonical audit event per high-trust state transition

Do not emit multiple competing events for the same semantic decision.

Good:

- one `review.approved`

Bad:

- `review_approved`
- `review_decision_saved`
- `resource_activated`

for the same logical act unless they truly represent distinct state transitions.

---

## 11. Standardized Helper Contracts

The audit service should evolve from a generic write helper toward structured helpers.

### 11.1 Base helper

Recommended base helper:

`write_audit_event(session, event_type, payload)`

This already exists and remains useful.

### 11.2 Structured helper layer

Add typed helper builders such as:

- `build_management_audit_event(...)`
- `build_runtime_audit_event(...)`
- `build_governance_decision_event(...)`

These helpers should:

- normalize actor/auth/resource/action fields
- attach authorization and governance results
- enforce required fields for rejections and trust actions

### 11.3 Outcome enforcement

Structured helpers should fail loudly if required fields are missing for high-trust decisions.

Example:

- rejection without reason
- governance event without actor id
- token action without token id

---

## 12. Migration Strategy

### 12.1 Phase 1: Standardize names

- adopt dotted `event_type` naming
- introduce `event_version`
- preserve backward compatibility in readers if needed

### 12.2 Phase 2: Standardize payload envelope

- normalize actor/auth/resource/action/outcome fields
- retrofit key existing actions:
  - session login/logout
  - review approve/reject
  - approval approve/reject
  - token issue/revoke
  - admin account disable

### 12.3 Phase 3: Connect authorization and request context

- include session and request correlation
- attach action names from the operator policy design

### 12.4 Phase 4: Expand denial capture

- start emitting normalized denied-action audit events
- capture manual-review-required outcomes explicitly where valuable

---

## 13. Testing Strategy

This design should be enforced with explicit tests.

### 13.1 Payload shape tests

Verify:

- required envelope fields exist
- event version is present
- resource and actor identifiers are normalized

### 13.2 Governance decision tests

Verify:

- review approval emits normalized decision event
- review rejection requires reason and emits normalized decision event
- approval rejection includes decision reason

### 13.3 Session and token tests

Verify:

- login accepted and rejected paths emit the correct event families
- token issue and revoke events include actor and token identifiers

### 13.4 Queryability tests

If indexed storage evolves later, add tests proving audit events can be filtered by:

- actor
- action
- resource
- session
- outcome

---

## 14. Decisions Locked By This Design

- Audit and inbox events are distinct event families.
- High-trust actions must use normalized actor/action/resource/result semantics.
- Governance decisions must record explicit decision results and rejection reasons.
- Request and session correlation are part of the audit model, not optional extras.
- The current generic audit table may stay, but payload semantics may no longer remain ad hoc.

---

## 15. Follow-On Work Triggered By This Design

- audit service refactor
- review and approval event normalization
- token governance audit normalization
- operator policy matrix implementation
- observability and incident workflow documentation updates

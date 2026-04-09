# P3 Readiness Review

This review is the formal gate for starting any P3 milestone.

Use it before:

- `P3.1 Managed Postgres`
- `P3.2 Managed Redis`
- `P3.3 Secret Lifecycle Hardening`
- `P3.4 Centralized Observability And Incident Flow`
- `P3.5 Operator Identity Modernization`
- `P3.6 HA Runtime And Traffic Resilience`

## Review Purpose

P3 work changes ownership, infrastructure, and operational risk. This review prevents the team from starting a milestone with unclear owners, missing rollback, or untested assumptions.

## Required Inputs

Before the review starts, collect:

- milestone name and scope
- named application owner
- named platform owner
- named security owner if the work affects identity, secrets, or break-glass access
- rollout plan
- rollback plan
- validation or smoke checklist
- restore or recovery proof for stateful dependency work
- incident destination and alert ownership notes

If any required input is missing, the review should stop and return `not ready`.

## Review Questions

### Ownership

1. Is the milestone owned by a named application owner?
2. Is the milestone owned by a named platform owner?
3. If security is involved, is a named security owner assigned?
4. Is approval authority clear for rollout and rollback?

### Change Safety

5. Is there a written rollout plan?
6. Is there a written rollback plan?
7. Are cutover prerequisites explicit?
8. Are post-cutover smoke checks defined?

### Recovery

9. For stateful work, is there restore or recovery proof?
10. For identity or secret work, is there break-glass guidance?
11. For traffic or HA work, is failover behavior documented?

### Observability

12. Are alerts or dashboards sufficient to detect milestone-specific failure?
13. Is there a clear incident destination if the milestone fails in production?

### Boundary Integrity

14. Does the milestone preserve the repository/platform ownership boundary?
15. Does the milestone avoid silently moving platform ownership back into the repository?

## Decision Outcomes

### Ready

Use `ready` only if:

- all required inputs are present
- no review question is unresolved
- owners agree the milestone can be rolled back safely

### Ready With Follow-Ups

Use `ready with follow-ups` only if:

- the milestone is safe to begin
- remaining gaps are non-blocking
- each follow-up has an owner and due date

### Not Ready

Use `not ready` if:

- an owner is missing
- rollback is unclear
- validation is missing
- stateful change lacks recovery proof
- incident routing is undefined

## Review Record Template

Copy this block into milestone notes or ticketing:

```md
Milestone:
Scope:

Application owner:
Platform owner:
Security owner:

Rollout plan:
Rollback plan:
Validation checklist:
Recovery proof:
Incident destination:

Decision:
Decision date:
Approvers:
Follow-ups:
```

## P3.0 Completion Rule

`P3.0 Ownership And Readiness` is complete only when:

- this readiness review exists
- the ownership matrix is current
- the incident escalation guide exists
- the handoff checklist references all three artifacts

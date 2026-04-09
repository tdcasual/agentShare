# Incident Response Playbook

This playbook complements `docs/guides/platform-incident-escalation.md` with a practical response sequence.

## First Five Minutes

1. Acknowledge the alert or operator report.
2. Classify severity.
3. Identify the first responder by incident class.
4. Open or update the shared incident record.
5. Capture a current health snapshot and deployment context.

## First Fifteen Minutes

1. Determine whether the fault is app, platform, identity, or secret related.
2. Check deploy status, `/healthz`, smoke output, and recent alerts.
3. Decide whether rollback is on the table.
4. Notify supporting owners.

## Mitigation Phase

- stabilize the service first
- avoid undocumented emergency changes
- record each mitigation action in order

## Closure Phase

- confirm service health
- confirm owner follow-up items
- capture timeline and lessons
- update runbooks if the process was incomplete

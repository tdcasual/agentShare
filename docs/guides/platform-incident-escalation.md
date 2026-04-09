# Platform Incident Escalation

This guide defines how incidents are detected, owned, escalated, and closed once the project begins P3 platformization work.

Use it together with:

- `docs/guides/platform-ownership-matrix.md`
- `docs/guides/platform-handoff-checklist.md`
- `docs/guides/p3-readiness-review.md`

## Purpose

P3 introduces cross-boundary work:

- repository-owned application behavior
- platform-owned runtime and managed services
- security-owned identity and secret-governance concerns

This document prevents incidents from stalling in an ownership gap.

## Severity Levels

### Sev 1

- public production outage
- control plane unreachable
- data loss or likely unrecoverable corruption
- secret compromise or likely active unauthorized access

**Expected response**

- immediate coordination across application owner, platform owner, and security owner if relevant

### Sev 2

- major degradation in a critical path
- managed dependency instability with active customer or operator impact
- deploy rollback required
- failover or backup process does not work as designed

**Expected response**

- immediate owner engagement and escalation to the cross-functional incident lead

### Sev 3

- partial feature degradation
- non-critical platform instability
- alert noise or dashboard inaccuracy without active service outage

**Expected response**

- routed to primary owner with tracked follow-up

### Sev 4

- documentation gap
- non-urgent verification failure
- rehearsal defect without current production impact

**Expected response**

- schedule fix in normal delivery flow

## Incident Classes And First Responder

| Incident class | First responder | Supporting owners |
| --- | --- | --- |
| App deploy failure | Application owner | Platform owner |
| App health failure | Application owner | Platform owner |
| Managed Postgres failure | Platform owner | Application owner |
| Managed Redis failure | Platform owner | Application owner |
| Secret backend unreachable | Platform owner | Application owner, Security owner |
| Secret misuse or suspected compromise | Security owner | Platform owner, Application owner |
| SSO or operator auth failure | Security owner | Platform owner, Application owner |
| DNS / ingress / failover failure | Platform owner | Application owner |
| Backup or restore failure | Platform owner | Application owner |

## Detection Sources

An incident may start from:

- centralized alerts
- smoke-check failures
- health endpoint failures
- backup or restore rehearsal failure
- operator report
- deploy pipeline failure
- security review or access anomaly

Detection source must be recorded in the incident notes.

## Escalation Flow

1. The first responder acknowledges the incident and classifies severity.
2. The first responder opens or updates the shared incident channel or record.
3. The first responder notifies the primary supporting owners listed for that class.
4. If the incident crosses ownership boundaries, assign an explicit incident lead.
5. If identity or secret compromise is suspected, notify the security owner immediately regardless of service impact.
6. If rollback is required, the application owner and platform owner must agree on the rollback path before execution.
7. Close the incident only after owner follow-up actions are recorded.

## Incident Lead Expectations

The incident lead is responsible for:

- keeping timeline notes current
- confirming owner assignments
- tracking mitigation and rollback decisions
- confirming post-incident review ownership

The incident lead may come from the application or platform side depending on the primary failure domain.

## Required Incident Record Fields

Every Sev 1 or Sev 2 incident should record:

- start time
- severity
- detection source
- primary incident class
- incident lead
- involved owners
- mitigation steps
- rollback decision
- customer/operator impact summary
- close time
- follow-up owner

## Closure And Follow-Up

Sev 1 and Sev 2 incidents require:

- a written timeline
- owner-confirmed remediation items
- runbook or alert updates if process gaps were found
- post-incident review scheduled within the team’s normal review window

Sev 3 and Sev 4 incidents may be closed through normal task tracking if no cross-boundary risk remains.

## P3 Gate Rule

No P3 milestone may be called complete unless incidents introduced by that milestone can be mapped to:

- a first responder
- an escalation path
- a rollback owner
- a follow-up owner

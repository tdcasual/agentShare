# Failover Rehearsal

This guide supports `P3.6 HA Runtime And Traffic Resilience`.

## Purpose

Prove that HA failover works in a controlled rehearsal instead of only in a real outage.

## Rehearsal Scope

- node loss or runtime-loss simulation
- traffic failover validation
- smoke validation after failover
- rollback validation if failover is not acceptable

## Rehearsal Steps

1. Announce rehearsal window and owners.
2. Confirm dashboards and alerts are visible.
3. Trigger the approved failover simulation.
4. Validate application reachability and smoke checks.
5. Confirm operators can still access critical management flows.
6. Record duration, issues, and required follow-up work.

## Evidence

- rehearsal date
- owners present
- failover duration
- smoke result
- open issues

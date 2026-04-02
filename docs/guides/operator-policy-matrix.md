# Operator Policy Matrix

This guide defines the human management action matrix for the control plane. It is the operator-facing companion to the application policy layer used by route checks.

## Role Intent

- `viewer`: read-only visibility into safe management surfaces.
- `operator`: governance and day-to-day operational coordination.
- `admin`: inventory, identity, and runtime administration.
- `owner`: full control, including destructive identity actions.

## Core Action Matrix

| Action | Viewer | Operator | Admin | Owner |
| --- | --- | --- | --- | --- |
| `admin_accounts:create` | no | no | yes | yes |
| `admin_accounts:disable` | no | no | yes, but never for owner targets | yes, but never for owner targets |
| `agents:create` | no | no | yes | yes |
| `agents:delete` | no | no | no | yes |
| `tokens:issue` | no | no | yes | yes |
| `tokens:revoke` | no | no | yes | yes |
| `reviews:list` | no | yes | yes | yes |
| `reviews:decide` | no | yes | yes | yes |
| `tasks:create` | no | yes | yes | yes |

## Notes

- `tasks:create` applies to human management sessions. Runtime agents may still submit tasks through the agent-authenticated flow, and those submissions remain subject to review policy.
- `admin_accounts:disable` is additionally protected by service logic: owner accounts cannot be disabled even by another privileged operator.
- Not every read endpoint is included here. Some inventory reads remain intentionally tighter when they expose privileged operator state or sensitive metadata.
- Route handlers should depend on action names rather than scattered inline role comparisons so future policy changes can remain centralized.

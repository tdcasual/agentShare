# Feature Requests

## [FEAT-20260728-001] authenticated-admin-password-change

**Logged**: 2026-07-28T09:03:34Z
**Priority**: medium
**Status**: resolved
**Area**: backend

### Requested Capability
Allow the initialized administrator to change their password securely without direct database access.

### User Context
The production administrator needs to rotate a weak password. The current application only supports bootstrap password creation and login; agent execution tools cannot safely transmit plaintext credentials because commands and stdin are captured.

### Complexity Estimate
medium

### Suggested Implementation
Add a session-only password-change API and settings UI. Verify the current password, enforce the bootstrap password policy, update the bcrypt hash, revoke other sessions, emit a redacted audit event, and require a fresh login. Cover API authorization, validation, session invalidation, audit behavior, and browser success/error states.

### Metadata
- Frequency: first_time
- Related Features: admin authentication, session management, audit logging

### Resolution
- **Resolved**: 2026-07-29T00:30:00Z
- **Notes**: Added the session-only API, shared password policy, all-session revocation, audit events, security settings UI, login notice, and API/unit/three-browser coverage.

---

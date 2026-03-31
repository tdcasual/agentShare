# Frontend Functional Refactor Requirements

**Goal:** Rebuild `apps/control-plane-v3` into a functionally coherent management console whose routes, state handling, permissions, and data behavior are consistent, observable, and production-usable.

**Audience:** Front-end engineers, full-stack engineers, and reviewers who need a single functional contract for future implementation work.

**In Scope:** Routing, session flow, permissions, data sources, client state, async behavior, errors, empty/loading/submitting states, optimistic updates, page responsibilities, and acceptance criteria.

**Out of Scope:** Visual style, layout polish, typography, colors, animation, spacing, illustration, and other UI/aesthetic decisions.

---

## 1. Why This Refactor Is Needed

The current front end has useful pieces, but it does not behave like a single coherent product.

Current baseline problems:

- The app mixes real management-console routes with local runtime/demo routes.
- Some pages depend on authenticated backend APIs, while other pages render local seeded data without management gating.
- The browser cannot reliably use the current API integration contract because the app calls `NEXT_PUBLIC_API_BASE_URL` directly from the client and assumes cross-origin credentialed requests will work.
- Global shell interactions exist, but several of them are placeholders and do not drive real product behavior.
- Page maturity is uneven: some routes are close to real workflows, some are prototypes, and some are placeholders.

Concrete code anchors in the current baseline:

- Client API base URL is hard-coded through environment configuration in `apps/control-plane-v3/.env.local` and consumed by `apps/control-plane-v3/src/lib/api-client.ts`.
- App entry is gated through `apps/control-plane-v3/src/lib/session.ts`, but not all routes follow the same contract.
- The global shell is always available through `apps/control-plane-v3/src/interfaces/human/layout/index.tsx`, even when a route should still be gated.
- `apps/control-plane-v3/src/app/spaces/page.tsx` is demo-data driven.
- `apps/control-plane-v3/src/app/tokens/page.tsx`, `assets/page.tsx`, `tasks/page.tsx`, `reviews/page.tsx`, and `settings/page.tsx` are intended to be real management pages.
- `apps/control-plane-v3/src/app/marketplace/page.tsx` is currently a placeholder.

The refactor must remove this ambiguity.

## 2. Product-Level Outcome

After the refactor, the front end must behave as a management console with one clear runtime model:

- Every route has a defined purpose.
- Every route has a defined access policy.
- Every page uses one explicit data source strategy.
- Every async action exposes the same state vocabulary.
- Every business operation either completes, fails with a meaningful reason, or is explicitly unavailable.
- Demo-only behavior is either removed, isolated behind a dev-only mode, or replaced with real backend-backed flows.

The user must never have to infer whether a page is "real" or "just a mock".

## 3. Non-Negotiable Principles

### 3.1 Single Product Mode Per Route

Each route must be exactly one of the following:

- Bootstrap route
- Authentication route
- Authenticated management route
- Public informational route
- Explicitly marked developer/demo route

A route must not blend multiple modes.

### 3.2 One Source of Truth Per Domain

Each domain surface must have a single authoritative backing source:

- Backend API
- Local runtime state
- Explicit dev fixture state

The same route must not silently mix backend truth with local seeded entities unless that behavior is deliberate, feature-flagged, and documented.

### 3.3 Fail Closed For Sensitive Workflows

Pages that require management authorization must not expose fake success paths when session or API state is unavailable.

Examples:

- Do not show an actionable "Create agent" flow if creation cannot succeed.
- Do not show operator identity/session info before session resolution completes.
- Do not show stale, local, or placeholder management data as if it were real.

### 3.4 State Must Be Explicit

Every data-driven page must express explicit state categories rather than ambiguous boolean combinations.

Minimum categories:

- `blocked`
- `loading`
- `ready`
- `refreshing`
- `empty`
- `submitting`
- `success`
- `error`

If a page can enter a state, that state must have a defined trigger, user-visible meaning, and transition behavior.

## 4. Required Front-End Runtime Architecture

## 4.1 App Entry Contract

The app must have one authoritative entry-state resolver.

Required entry states:

- `bootstrap_required`
- `login_required`
- `authenticated_ready`
- `unavailable`

Required behavior:

- `/` must resolve entry state before rendering the authenticated shell.
- If bootstrap is not complete, the user goes to `/setup`.
- If bootstrap is complete but there is no valid session, the user goes to `/login`.
- If session is valid, the user goes to the default authenticated landing route.
- If bootstrap/session resolution fails for operational reasons, the app must show an unavailable state with a retry path and diagnostic copy.

The current contract in `src/lib/session.ts` is directionally correct, but it must become the canonical app-wide routing authority rather than one of several competing flows.

## 4.2 Route Access Matrix

The refactor must define and enforce a route policy table like this:

| Route | Required State | Data Source | Unauthorized Behavior |
| --- | --- | --- | --- |
| `/` | entry resolution only | bootstrap + session | redirect to `/setup` or `/login` |
| `/setup` | system uninitialized | backend API | redirect to `/login` if already initialized |
| `/login` | system initialized, unauthenticated | backend API | redirect to default authenticated route if session exists |
| `/identities` | authenticated or explicitly public demo route | one source only | redirect or public read-only mode, not both |
| `/spaces` | authenticated or explicit dev/demo route | one source only | redirect or dev mode, not silent mock |
| `/tokens` | authenticated management route | backend API | redirect to `/login` on 401 |
| `/assets` | authenticated management route | backend API | redirect to `/login` on 401 |
| `/tasks` | authenticated management route | backend API | redirect to `/login` on 401 |
| `/reviews` | authenticated management route | backend API | redirect to `/login` on 401 |
| `/settings` | authenticated management route | backend API | redirect to `/login` on 401 |
| `/marketplace` | authenticated route or explicit placeholder route | declared source | render explicitly unavailable if not implemented |

Required outcome:

- The route policy must live in code, not only in docs.
- Authenticated route enforcement must be consistent.
- Unauthorized users must not see a misleading partial shell that implies they are inside the system.

## 4.3 API Access Boundary

The front end must stop assuming direct browser-to-API cross-origin requests are always valid.

One of the following must be adopted and used consistently:

1. Same-origin BFF/proxy pattern through Next.js route handlers.
2. A verified cross-origin contract that supports credentialed requests, including CORS and cookie behavior.

Recommended requirement:

- Prefer same-origin front-end API access for management routes.

Functional requirements:

- The browser must only call endpoints that are valid in a real browser session.
- Session-bearing requests must work in local development, staging, and production with the same high-level contract.
- Environment configuration must not create different routing assumptions in different environments.

Specific baseline inconsistency to remove:

- README/dev instructions and actual port/runtime behavior must match.
- The front end must not rely on manually knowing whether the app is on `3000` or `3001`.

## 4.4 Domain Boundary

The front end currently mixes:

- local runtime identity state
- backend management state
- placeholder content

The refactor must split these cleanly.

Required domain decision:

- `management console` data and `runtime demo` data must be separate product modes.

Acceptable implementations:

- Move demo/runtime pages into a dedicated `/demo` namespace.
- Replace demo/local pages with real backend-driven pages.
- Keep demo behavior only behind an explicit dev feature flag.

Not acceptable:

- A management route that appears production-real but is secretly driven by local demo state.

## 5. Global State Model Requirements

## 5.1 Session State

Session state must be centralized and typed.

Required session model:

- `unknown`
- `anonymous`
- `authenticated`
- `expired`
- `forbidden`
- `unavailable`

Rules:

- Session must be resolved once at app boot, then reused.
- Route-level gating must consume the same session state store or query layer.
- Session refresh must be possible after login, logout, and privileged actions.
- Logout must clear client-visible auth state immediately and invalidate dependent queries.

## 5.2 Query State

All remote resources must use one standard async state contract.

Minimum fields:

- `status`
- `data`
- `error`
- `lastLoadedAt`
- `isRefreshing`
- `isStale`

Rules:

- A page must not infer readiness from `data != null` alone.
- Empty data and unavailable data must be distinct states.
- Background refresh must not replace ready content with a blocking spinner.
- Hard failures must preserve prior good data when safe to do so.

## 5.3 Mutation State

Every mutation must expose:

- idle
- validating
- submitting
- success
- failed

Mutation rules:

- Double-submit protection is required.
- Success must update the relevant local cache or invalidate the correct resource keys.
- Failure must preserve user input when retry is sensible.
- One-time secret/token reveal flows must have special handling and must never rely on hidden local memory only.

## 5.4 Derived State

Counts, badges, and dashboard summaries must be derived from canonical data, not hardcoded placeholders.

Examples:

- Task badge counts
- Review queue counts
- Active token counts
- Online entity counts

If real data is not available:

- Hide the derived metric, or
- mark it unavailable, or
- explicitly show a placeholder state in dev/demo mode

But do not silently hardcode production-looking numbers.

## 6. Global Shell Requirements

The shared application shell must be functionally real.

Required shell behaviors:

- Navigation reflects current route and access rights.
- Global search either works against a declared scope or is removed/disabled until implemented.
- "Create" entrypoints must open a real action chooser or be route-aware; they must not be no-op buttons.
- Notifications and messages must either bind to real data or be clearly marked unavailable.
- User menu must reflect authenticated session identity, not runtime demo identity, on management routes.

Specific no-op behaviors that must be eliminated:

- Empty `onCreateClick`
- Empty "mark all read" handlers
- Search inputs with no behavior contract

## 7. Functional Requirements By Route

## 7.1 `/setup`

Purpose:

- Complete first-owner bootstrap exactly once.

Requirements:

- Must block access when bootstrap is already complete.
- Must validate input before submit.
- Must surface field-level and form-level errors separately.
- Must differentiate invalid bootstrap credential, validation failure, duplicate bootstrap attempt, and backend unavailability.
- On success, must transition into the login flow with a clean post-bootstrap state.

## 7.2 `/login`

Purpose:

- Establish a management session for persisted admin accounts.

Requirements:

- Must not render an unexplained `Failed to fetch` at idle.
- Must perform bootstrap precheck, session precheck, and login submission through the same transport contract used elsewhere.
- Must distinguish invalid credentials from service/network failure.
- Must redirect authenticated users away from login.
- Must support retry after transient failures without losing input unnecessarily.

## 7.3 `/`

Purpose:

- Entry-state router, not a half-loaded dashboard.

Requirements:

- Must not render the authenticated shell before entry state resolves.
- Must not fall back to runtime/demo content when management entry resolution fails.
- Must show one of: redirecting, unavailable, or authenticated landing.

## 7.4 `/identities`

Decision required:

- Either convert this page into a real management page backed by API data, or move it into a demo/runtime namespace.

If kept as a management page:

- Data must come from the backend.
- Filters, search, and counts must operate on backend data.
- Create/view actions must have real behaviors.
- Presence state must have a defined source and freshness model.

If kept as a demo page:

- It must not share the same route namespace as authenticated management pages.
- It must not reuse management-session shell semantics.

## 7.5 `/spaces`

Current behavior is a chat-like demo surface and must be treated as such until replaced.

Required outcomes:

- Decide whether Spaces is a real collaboration product or a demo.
- If real:
  - load spaces, membership, messages, and unread counts from an authoritative source;
  - sending a message must mutate state and update the thread;
  - create/invite actions must complete or fail explicitly;
  - active thread selection must sync with route or URL state.
- If not real:
  - move to explicit demo mode and remove management-console ambiguity.

Not acceptable:

- A message input and send button that accept input but perform no state transition.

## 7.6 `/tokens`

Purpose:

- Manage agents and managed runtime tokens.

Requirements:

- Session gating must fully block unauthorized use.
- API failures must not coexist with misleading actionable empty states.
- Agent list, token list, trust score, and feedback counts must come from real data only.
- Create agent and create token flows must invalidate and refresh the correct datasets.
- Revoke token must support optimistic or pessimistic update, but behavior must be consistent.
- One-time reveal flows must provide a durable copy/review path and clear post-success state.

## 7.7 `/assets`

Purpose:

- Manage governed secrets and capabilities.

Requirements:

- Secret creation and capability creation must use explicit mutation state and validation state.
- Capability access policy composition must produce deterministic payloads.
- Refresh behavior must synchronize secrets, capabilities, and dependent token data consistently.
- Pages must expose clear distinctions among draft, review-required, active, rejected, and unavailable states.

## 7.8 `/tasks`

Purpose:

- Create targeted tasks, inspect execution targets, and record target feedback.

Requirements:

- Task creation must validate target mode and payload structure before submit.
- JSON input handling must separate parse failure from server rejection.
- Task list, run list, token lookup, and feedback lookup must behave as one coordinated dashboard state rather than unrelated queries.
- Selecting a task must never expose stale target/run/feedback relationships that belong to a previous selection.

## 7.9 `/reviews`

Purpose:

- Review pending items and approve or reject them.

Requirements:

- Polling must be bounded and must not degrade into duplicate action risk.
- Approve/reject actions must lock the affected row or action set while pending.
- Queue metrics and queue contents must stay in sync after a mutation.
- Empty queue state must be meaningfully distinct from load failure and auth failure.

## 7.10 `/settings`

Purpose:

- Manage invited admin accounts and current management session.

Requirements:

- Session state must drive the page header and role-sensitive actions.
- Invite account flow must validate role, password, and duplicate-account errors.
- Disable account must reflect role-based permission constraints.
- Logout must clear session state and dependent page caches.

## 7.11 `/marketplace`

A placeholder route is acceptable only if it is explicit.

Requirements:

- If not implemented, the route must declare itself unavailable and expose no fake search/browse behavior.
- If implemented later, it must adopt the same route-state, data-source, and permission contracts as other management pages.

## 8. Error Handling Requirements

## 8.1 Error Taxonomy

The front end must normalize errors into a small set of actionable categories:

- validation error
- authentication required
- forbidden
- not found
- conflict
- rate limited
- network unavailable
- backend unavailable
- unknown error

Rules:

- Raw `Failed to fetch` must never be the final user-facing message for a known management workflow.
- The UI layer may show simplified copy, but the app must retain structured error codes for logic and diagnostics.

## 8.2 Error Placement

Error display requirements:

- Field validation errors stay with fields.
- Mutation errors stay with the mutation surface.
- Page load errors occupy the page state region.
- Global shell errors only represent truly global failures.

## 8.3 Retry Policy

Retry rules must be explicit:

- Safe idempotent queries may auto-retry.
- Session failures must trigger controlled revalidation, not infinite loops.
- Mutations must never auto-retry without an idempotency guarantee.

## 9. Loading, Empty, and Refreshing Requirements

The refactor must standardize non-error transient states.

Required behaviors:

- Initial page load may block.
- Background refresh must preserve usable content.
- Empty states must only appear when the query succeeded with zero results.
- Submitting state must not be confused with loading state.
- Refresh controls must not reset page context or selection state unless necessary.

Minimum rule:

- `loading`, `empty`, and `error` must be mutually exclusive at render time for a single query surface.

## 10. Data Consistency And Caching Requirements

Caching must be predictable and domain-driven.

Requirements:

- Each domain must own its key space and invalidation rules.
- Post-mutation invalidation must cover all affected derived views.
- Bulk dashboards must not drift from detail views after mutations.
- Cached session data must be invalidated on login, logout, 401 recovery, and role-changing operations.

The current SWR usage can remain, but it must be standardized around explicit query-key ownership and mutation side effects.

## 11. Demo Data Policy

The refactor must adopt a strict demo-data policy.

Allowed:

- Explicit development fixtures
- Storybook/test fixtures
- Dev-only routes
- Feature-flagged mock mode

Not allowed:

- Management route backed by silent local seeds
- Fake shell metrics presented as real operational data
- Placeholder actions that imply production availability

If demo behavior remains, it must satisfy all of:

- route namespace separation
- explicit environment gating
- visible product-mode distinction in code and behavior

## 12. Observability And Diagnostics Requirements

Functional observability is required.

The front end must emit enough diagnostic information to answer:

- Did session resolution fail, or did the route gate fail?
- Did the transport fail, or did the backend reject the request?
- Which query or mutation is stale, pending, or failed?
- Which route entered demo mode, if any?

Minimum requirements:

- structured console logging only in development
- normalized client error objects
- request correlation support when backend request IDs are available

## 13. Testing Requirements

The refactor is not complete without behavior-level tests.

Required coverage:

- Entry routing tests for bootstrap, login required, authenticated ready, and unavailable.
- Session gate tests for authenticated management routes.
- Query-state tests for loading, empty, ready, refresh, and error.
- Mutation tests for create, update, revoke, approve, reject, and logout flows.
- Route-specific tests for pages that currently mix real and mock behavior.
- Browser-level tests proving that local development actually works in a real browser session.

Critical acceptance tests:

- A browser can load `/login` without transport failure.
- A browser can log in and land on an authenticated route.
- Authenticated routes do not expose misleading local/demo content when backend data fails.
- Demo-only routes, if retained, are explicitly isolated.

## 14. Acceptance Criteria

This refactor is complete only when all of the following are true:

- The app has one documented and enforced route-access model.
- The browser transport contract works in local development without manual workarounds.
- Management routes use real session-aware data sources consistently.
- Demo/local seeded data is either removed from management routes or explicitly isolated.
- Global shell actions are either fully functional or intentionally unavailable.
- No critical workflow surfaces raw transport failure as its primary idle-state message.
- Placeholder pages are clearly declared and do not masquerade as active product areas.
- Query and mutation state vocabularies are consistent across domains.
- The test suite covers the route, session, data, and mutation contracts described in this document.

## 15. Recommended Delivery Order

Implementation should follow this order:

1. Fix the browser transport/session contract.
2. Centralize route access enforcement and entry-state routing.
3. Separate management mode from demo/runtime mode.
4. Make the global shell functionally real or intentionally unavailable.
5. Convert high-value management pages first: `tokens`, `assets`, `tasks`, `reviews`, `settings`.
6. Decide the fate of `identities` and `spaces`: real product surfaces or explicit demo surfaces.
7. Replace or isolate placeholders such as `marketplace`.
8. Add browser-level verification for all critical workflows.

## 16. Implementation Notes For Future Planning

When this document is later converted into an implementation plan, the plan should break work into tracks:

- Transport and session foundation
- Route policy enforcement
- Domain data normalization
- Shell behavior repair
- Page-by-page migration
- Test and verification hardening

This document intentionally does not prescribe UI changes. Any future UI work must remain subordinate to the functional contracts defined here.

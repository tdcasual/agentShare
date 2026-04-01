# Events Inbox And Search Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first production-ready slice of the unified event inbox and live grouped search so agent task feedback and operator-facing signals become visible in the control plane.

**Architecture:** Add a new `events` domain in `apps/api` for persisted operational events plus a lightweight grouped `/api/search` endpoint that aggregates existing backend entities. Then add a frontend `event` domain in `apps/control-plane-v3`, replace the current notifications/messages placeholders with a real inbox surface, and switch global search from mock results to grouped backend-backed results.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Pydantic, pytest, Next.js App Router, React 19, SWR, Vitest, Testing Library.

---

## Scope

This plan intentionally covers only Phase 1:

- backend `events`
- frontend inbox / notification surface
- backend grouped search
- frontend live grouped search

Deferred to the next plan:

- self-managed identity profiles
- agent-only marketplace
- full expiration-job infrastructure beyond simple token warning surfacing

---

### Task 1: Add Backend Event Storage And Read APIs

**Files:**
- Create: `apps/api/alembic/versions/20260331_01_events_and_search.py`
- Create: `apps/api/app/orm/event.py`
- Create: `apps/api/app/repositories/event_repo.py`
- Create: `apps/api/app/schemas/events.py`
- Create: `apps/api/app/services/event_service.py`
- Create: `apps/api/app/routes/events.py`
- Modify: `apps/api/app/orm/__init__.py`
- Modify: `apps/api/app/routes/__init__.py`
- Test: `apps/api/tests/test_events_api.py`

**Step 1: Write the failing API test**

Add `apps/api/tests/test_events_api.py` with two management-session tests:

```python
def test_management_can_list_persisted_events(client, management_client):
    response = management_client.get("/api/events")
    assert response.status_code == 200
    assert response.json() == {"items": []}


def test_management_can_mark_an_event_read(client, management_client, session_factory):
    session = session_factory()
    try:
        from app.services.event_service import record_event
        record_event(
            session,
            event_type="task_completed",
            actor_type="agent",
            actor_id="test-agent",
            subject_type="task",
            subject_id="task-123",
            summary="Analyzer Agent completed task-123",
        )
        session.commit()
    finally:
        session.close()

    listed = management_client.get("/api/events")
    event_id = listed.json()["items"][0]["id"]

    marked = management_client.post(f"/api/events/{event_id}/read")
    assert marked.status_code == 200
    assert marked.json()["read_at"] is not None
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_events_api.py -q
```

Expected: FAIL because `/api/events` does not exist and `record_event` cannot be imported yet.

**Step 3: Add minimal backend implementation**

Implement:

- `EventModel` with fields:
  - `id`
  - `event_type`
  - `actor_type`
  - `actor_id`
  - `subject_type`
  - `subject_id`
  - `summary`
  - `details`
  - `severity`
  - `action_url`
  - `metadata`
  - `read_at`
  - timestamps via `TimestampMixin`
- Alembic migration for the `events` table plus useful indexes on `created_at`, `event_type`, and `read_at`
- `EventRepository` methods:
  - `create(...)`
  - `list_recent(limit=...)`
  - `mark_read(event_id)`
- Pydantic response models:
  - `EventResponse`
  - `EventListResponse`
  - `MarkEventReadResponse`
- `event_service.py` helpers:
  - `record_event(...)`
  - `list_events(...)`
  - `mark_event_read(...)`
- `events.py` routes:
  - `GET /api/events`
  - `POST /api/events/{event_id}/read`
  - require management session for both routes in this first slice

**Step 4: Re-run the focused backend test**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_events_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/alembic/versions/20260331_01_events_and_search.py apps/api/app/orm/event.py apps/api/app/repositories/event_repo.py apps/api/app/schemas/events.py apps/api/app/services/event_service.py apps/api/app/routes/events.py apps/api/app/orm/__init__.py apps/api/app/routes/__init__.py apps/api/tests/test_events_api.py
git commit -m "feat(api): add events storage and read endpoints"
```

---

### Task 2: Emit Events From Task Completion And Human Feedback

**Files:**
- Modify: `apps/api/app/routes/tasks.py`
- Modify: `apps/api/app/routes/token_feedback.py`
- Modify: `apps/api/app/services/event_service.py`
- Test: `apps/api/tests/test_events_api.py`
- Test: `apps/api/tests/test_token_feedback_api.py`

**Step 1: Extend the failing tests**

Add assertions to `apps/api/tests/test_events_api.py`:

```python
def test_task_target_completion_creates_event(client, management_client):
    created = management_client.post(
        "/api/tasks",
        json={
            "title": "Inbox event task",
            "task_type": "account_read",
            "target_token_ids": ["token-test-agent"],
            "target_mode": "explicit_tokens",
        },
    )
    assert created.status_code == 201

    assigned = client.get("/api/tasks/assigned", headers={"Authorization": "Bearer agent-test-token"})
    target_id = assigned.json()["items"][0]["id"]

    client.post(f"/api/task-targets/{target_id}/claim", headers={"Authorization": "Bearer agent-test-token"})
    client.post(
        f"/api/task-targets/{target_id}/complete",
        headers={"Authorization": "Bearer agent-test-token"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )

    events = management_client.get("/api/events")
    assert any(item["event_type"] == "task_completed" for item in events.json()["items"])
```

Also extend `apps/api/tests/test_token_feedback_api.py`:

```python
def test_feedback_creation_emits_event(client, management_client):
    target_id, _ = _create_completed_target(client, management_client)
    management_client.post(
        f"/api/task-targets/{target_id}/feedback",
        json={"score": 5, "verdict": "accepted", "summary": "Looks good"},
    )

    events = management_client.get("/api/events")
    assert any(item["event_type"] == "task_feedback_posted" for item in events.json()["items"])
```

**Step 2: Run the two tests and verify the new assertions fail**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_events_api.py tests/test_token_feedback_api.py -q
```

Expected: FAIL because routes do not emit event rows yet.

**Step 3: Implement event emission**

Add `record_event(...)` calls after:

- successful task-target completion in `apps/api/app/routes/tasks.py`
- successful task completion in `apps/api/app/routes/tasks.py`
- successful token feedback creation in `apps/api/app/routes/token_feedback.py`

Use event payloads such as:

- `event_type="task_completed"`
- `event_type="task_feedback_posted"`
- `actor_type="agent"` for runtime completions
- `actor_type="human"` or management actor type for feedback
- `subject_type="task_target"` or `subject_type="task"`
- `action_url="/tasks"`

Keep the human-readable `summary` sentence ready for direct inbox display.

**Step 4: Re-run the focused tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_events_api.py tests/test_token_feedback_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/app/routes/tasks.py apps/api/app/routes/token_feedback.py apps/api/app/services/event_service.py apps/api/tests/test_events_api.py apps/api/tests/test_token_feedback_api.py
git commit -m "feat(api): emit inbox events for task completion and feedback"
```

---

### Task 3: Add Frontend Event Domain And Replace Placeholder Messaging With A Real Inbox

**Files:**
- Create: `apps/control-plane-v3/src/domains/event/types.ts`
- Create: `apps/control-plane-v3/src/domains/event/api.ts`
- Create: `apps/control-plane-v3/src/domains/event/hooks.ts`
- Create: `apps/control-plane-v3/src/domains/event/index.ts`
- Create: `apps/control-plane-v3/src/app/inbox/page.tsx`
- Create: `apps/control-plane-v3/src/app/inbox/page.test.tsx`
- Modify: `apps/control-plane-v3/src/components/notifications.tsx`
- Modify: `apps/control-plane-v3/src/hooks/use-notifications.ts`
- Modify: `apps/control-plane-v3/src/hooks/use-notifications.test.ts`
- Modify: `apps/control-plane-v3/src/interfaces/human/layout/header.tsx`
- Modify: `apps/control-plane-v3/src/lib/route-policy.ts`
- Modify: `apps/control-plane-v3/src/app/shell-route-integrity.test.ts`

**Step 1: Write the failing frontend tests**

Update `apps/control-plane-v3/src/hooks/use-notifications.test.ts` so the source is no longer hard-coded unavailable:

```tsx
it('uses the events endpoint as the inbox source', () => {
  const source = getNotificationsSource()
  expect(source.kind).toBe('backend')
  expect(source.endpoint).toBe('/api/events')
})
```

Create `apps/control-plane-v3/src/app/inbox/page.test.tsx`:

```tsx
it('renders event summaries from the inbox feed', () => {
  // mock useEvents to return a task_completed item
  // assert the summary and unread state render
})
```

**Step 2: Run the focused frontend tests and verify failure**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts src/app/inbox/page.test.tsx src/app/shell-route-integrity.test.ts
```

Expected: FAIL because the inbox route and backend source do not exist in frontend code yet.

**Step 3: Implement the event domain and inbox UI**

Implement:

- `domains/event/*` typed fetchers for:
  - `getEvents()`
  - `markEventRead(eventId)`
- update `use-notifications.ts` to use `/api/events`
- adapt `Notifications` so it becomes the bell-driven inbox dropdown
- remove the “Messages coming soon” placeholder path from `header.tsx`
- add `/inbox` as a real authenticated route in `route-policy.ts`
- create `src/app/inbox/page.tsx` with:
  - unread filter
  - event list
  - per-event action link to `/tasks` or other `action_url`

The minimum first slice is:

- dropdown bell shows unread count
- dropdown renders event summaries
- full-page inbox route renders the same data in a larger layout

**Step 4: Re-run the focused frontend tests**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts src/app/inbox/page.test.tsx src/app/shell-route-integrity.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/control-plane-v3/src/domains/event/types.ts apps/control-plane-v3/src/domains/event/api.ts apps/control-plane-v3/src/domains/event/hooks.ts apps/control-plane-v3/src/domains/event/index.ts apps/control-plane-v3/src/app/inbox/page.tsx apps/control-plane-v3/src/app/inbox/page.test.tsx apps/control-plane-v3/src/components/notifications.tsx apps/control-plane-v3/src/hooks/use-notifications.ts apps/control-plane-v3/src/hooks/use-notifications.test.ts apps/control-plane-v3/src/interfaces/human/layout/header.tsx apps/control-plane-v3/src/lib/route-policy.ts apps/control-plane-v3/src/app/shell-route-integrity.test.ts
git commit -m "feat(web): replace placeholder messaging with inbox events"
```

---

### Task 4: Add Backend Grouped Search Endpoint

**Files:**
- Create: `apps/api/app/schemas/search.py`
- Create: `apps/api/app/services/search_service.py`
- Create: `apps/api/app/routes/search.py`
- Modify: `apps/api/app/routes/__init__.py`
- Modify: `apps/api/app/repositories/agent_repo.py`
- Modify: `apps/api/app/repositories/task_repo.py`
- Modify: `apps/api/app/repositories/secret_repo.py`
- Modify: `apps/api/app/repositories/capability_repo.py`
- Modify: `apps/api/app/repositories/event_repo.py`
- Test: `apps/api/tests/test_search_api.py`

**Step 1: Write the failing API test**

Create `apps/api/tests/test_search_api.py`:

```python
def test_grouped_search_returns_identities_tasks_assets_and_events(client, management_client):
    response = management_client.get("/api/search", params={"q": "test"})
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"identities", "tasks", "assets", "events"}
```

Add a richer test fixture later in the same file that creates:

- an agent
- a task
- a secret or capability
- an event

and asserts each group returns at least one result for a matching query.

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_search_api.py -q
```

Expected: FAIL because `/api/search` does not exist.

**Step 3: Implement grouped search**

Add `GET /api/search?q=...` returning:

```json
{
  "identities": [],
  "tasks": [],
  "assets": [],
  "events": []
}
```

Use repo-level query helpers that do simple case-insensitive search against:

- agent name / id
- admin account email / display name / id
- task title / task type / id
- secret display name / provider / id
- capability name / id
- event summary / subject id / actor id

Keep the first slice intentionally simple:

- limit each group to 5 results
- no ranking engine yet
- management-session auth only

**Step 4: Re-run the search API test**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_search_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/api/app/schemas/search.py apps/api/app/services/search_service.py apps/api/app/routes/search.py apps/api/app/routes/__init__.py apps/api/app/repositories/agent_repo.py apps/api/app/repositories/task_repo.py apps/api/app/repositories/secret_repo.py apps/api/app/repositories/capability_repo.py apps/api/app/repositories/event_repo.py apps/api/tests/test_search_api.py
git commit -m "feat(api): add grouped search endpoint"
```

---

### Task 5: Replace Mock Global Search With Live Grouped Results

**Files:**
- Create: `apps/control-plane-v3/src/domains/search/types.ts`
- Create: `apps/control-plane-v3/src/domains/search/api.ts`
- Create: `apps/control-plane-v3/src/domains/search/hooks.ts`
- Create: `apps/control-plane-v3/src/domains/search/index.ts`
- Modify: `apps/control-plane-v3/src/components/global-search.tsx`
- Create: `apps/control-plane-v3/src/components/global-search.test.tsx`

**Step 1: Write the failing UI test**

Create `apps/control-plane-v3/src/components/global-search.test.tsx`:

```tsx
it('renders grouped backend search results', async () => {
  // mock useSearch to return identities/tasks/assets/events
  // type into the input
  // assert the section headers and one result from each populated group
})
```

Also add an assertion that no mock “Search Agents” / “Search Tasks” placeholder strings remain.

**Step 2: Run the test to verify failure**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/components/global-search.test.tsx
```

Expected: FAIL because the component still returns mock data.

**Step 3: Implement the live grouped search hook and UI**

Implement:

- `domains/search/*` for `/api/search`
- debounce stays in `global-search.tsx`
- fetch grouped results when query length is at least 2
- render group headings:
  - `Identities`
  - `Tasks`
  - `Assets`
  - `Events`
- each result row uses backend `href` if present, otherwise derive route targets

Keep the current keyboard UX:

- arrow navigation
- enter to open selected result
- click outside to close

**Step 4: Re-run the focused test**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/components/global-search.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/control-plane-v3/src/domains/search/types.ts apps/control-plane-v3/src/domains/search/api.ts apps/control-plane-v3/src/domains/search/hooks.ts apps/control-plane-v3/src/domains/search/index.ts apps/control-plane-v3/src/components/global-search.tsx apps/control-plane-v3/src/components/global-search.test.tsx
git commit -m "feat(web): replace mock global search with grouped live search"
```

---

### Task 6: Wire Live Event Summaries Into The Hub And Run End-To-End Verification

**Files:**
- Modify: `apps/control-plane-v3/src/app/page.tsx`
- Modify: `apps/control-plane-v3/src/app/control-plane-pages.test.ts`
- Modify: `apps/control-plane-v3/src/app/manifest-assets.test.ts` if route manifests need updates
- Test: `apps/api/tests/test_events_api.py`
- Test: `apps/api/tests/test_search_api.py`
- Test: `apps/control-plane-v3/src/components/global-search.test.tsx`
- Test: `apps/control-plane-v3/src/app/inbox/page.test.tsx`

**Step 1: Add one failing frontend assertion**

Update `apps/control-plane-v3/src/app/control-plane-pages.test.ts` or add a dedicated test asserting the hub no longer relies solely on hard-coded activity for the inbox summary card.

A minimum assertion:

```tsx
expect(source).toMatch(/useEvents|useNotifications/)
```

**Step 2: Run the final focused test set**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_events_api.py tests/test_search_api.py -q

cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts src/components/global-search.test.tsx src/app/inbox/page.test.tsx src/app/control-plane-pages.test.ts
```

Expected: at least one FAIL before the hub is updated.

**Step 3: Implement the hub summary wiring**

Update `apps/control-plane-v3/src/app/page.tsx` so:

- recent activity cards can consume live inbox events when available
- hard-coded demo activity becomes a fallback only
- the control plane homepage reflects real task feedback/completion activity first

Do not try to redesign the entire homepage in this slice; just swap the fake activity source for the live feed where practical.

**Step 4: Run all verification commands**

Run:

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/api
pytest tests/test_events_api.py tests/test_search_api.py tests/test_token_feedback_api.py -q

cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3
npx vitest run src/hooks/use-notifications.test.ts src/components/global-search.test.tsx src/app/inbox/page.test.tsx src/app/control-plane-pages.test.ts src/app/shell-route-integrity.test.ts
npm run typecheck
```

Expected:

- backend tests PASS
- frontend tests PASS
- `npm run typecheck` exits 0

**Step 5: Commit**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare
git add apps/control-plane-v3/src/app/page.tsx apps/control-plane-v3/src/app/control-plane-pages.test.ts apps/api/tests/test_events_api.py apps/api/tests/test_search_api.py apps/api/tests/test_token_feedback_api.py apps/control-plane-v3/src/components/global-search.test.tsx apps/control-plane-v3/src/app/inbox/page.test.tsx
git commit -m "feat: surface live events and grouped search in the control plane"
```

---

## Verification Checklist

Before calling this phase done:

- `/api/events` returns persisted task completion and feedback events
- the header bell shows unread event count
- `/inbox` renders live events
- global search no longer uses mock data
- `/api/search` returns grouped results
- the hub can show real recent event summaries

---

## Follow-On Plan After This One

The next implementation plan should cover:

- identity profiles with self-managed vs system-managed fields
- agent-only marketplace
- review and moderation flows for market publications
- skill-aware search expansion

---

Plan complete and saved to `docs/plans/2026-03-31-events-inbox-search-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?

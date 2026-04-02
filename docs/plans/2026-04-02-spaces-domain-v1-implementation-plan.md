# Spaces Domain V1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `/spaces` from a stitched operational dashboard into a persisted application domain with explicit space records, members, and timeline context for tasks, reviews, and events.

**Architecture:** Implement Spaces as a lightweight app-owned operational container, not a chat system. First establish persisted backend records and API contracts. Then add timeline projection hooks from existing events, reviews, and tasks. Finally switch the frontend from aggregate-only rendering to API-backed space context with focused entry behavior.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, pytest, Next.js 15 App Router, React 19, TypeScript, SWR, Vitest.

---

## Read Before Implementing

- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-02-control-plane-architecture-design.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-02-operator-identity-and-policy-design.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.test.tsx`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/event_service.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/review_service.py`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/tasks.py`

## Scope

- In scope:
  - persisted `space`, `space_member`, and `space_timeline_entry`
  - create/list/read space APIs
  - member attach/list behavior
  - timeline entries linked to tasks, reviews, and events
  - focused `/spaces` UI backed by API data
- Out of scope:
  - chat transport
  - websocket collaboration
  - comments, documents, or arbitrary files
  - external sharing or public spaces

## Task 1: Establish The Spaces Backend Contract

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/space.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/space_member.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/orm/space_timeline_entry.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/repositories/space_repo.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/spaces.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/spaces.py`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/alembic/versions/20260402_03_spaces_domain_v1.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_spaces_api.py`

**Step 1: Write the failing backend contract tests**

Cover:

- create a space
- list spaces
- fetch a single space with members and timeline
- attach a member to a space
- filter spaces by `agent_id` when focus context is present

**Step 2: Run the focused backend tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_spaces_api.py -q
```

Expected: FAIL because the persisted spaces domain and API do not exist yet.

**Step 3: Write the minimal backend implementation**

Model only these records:

- `space`
- `space_member`
- `space_timeline_entry`

Required baseline fields:

- `space.id`, `name`, `summary`, `status`, `created_by_actor_id`
- `space_member.space_id`, `member_type`, `member_id`, `role`
- `space_timeline_entry.space_id`, `entry_type`, `subject_type`, `subject_id`, `summary`, `created_at`

Add create/list/read endpoints only. Do not add update or delete in V1 unless required by tests.

**Step 4: Re-run the backend tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_spaces_api.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/orm/space.py apps/api/app/orm/space_member.py apps/api/app/orm/space_timeline_entry.py apps/api/app/repositories/space_repo.py apps/api/app/schemas/spaces.py apps/api/app/routes/spaces.py apps/api/alembic/versions/20260402_03_spaces_domain_v1.py apps/api/app/routes/__init__.py apps/api/tests/test_spaces_api.py
git commit -m "feat(spaces): add persisted spaces backend v1"
```

## Task 2: Project Existing Workflow Activity Into Space Timeline Entries

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/space_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/event_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/review_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/tasks.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_spaces_timeline.py`

**Step 1: Write the failing timeline tests**

Cover:

- task completion can appear as a space timeline entry
- review approval or rejection can appear as a space timeline entry
- event-linked context can be materialized into a focused space timeline
- duplicate source events do not create duplicate timeline rows

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_spaces_timeline.py -q
```

Expected: FAIL because spaces have no projection service yet.

**Step 3: Write the minimal projection implementation**

Implement a small `space_service` that can:

- resolve or create focused operational space context where appropriate
- append timeline entries from existing task, review, and event transitions
- prevent duplicate writes for the same `(space_id, subject_type, subject_id, entry_type)` combination

Do not redesign task or review lifecycles. Only project them into spaces.

**Step 4: Re-run the focused tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_spaces_timeline.py -q
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/app/services/space_service.py apps/api/app/services/event_service.py apps/api/app/services/review_service.py apps/api/app/routes/tasks.py apps/api/tests/test_spaces_timeline.py
git commit -m "feat(spaces): project workflow activity into space timelines"
```

## Task 3: Replace The Aggregate-Only Spaces Page With API-Backed Space Context

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/space/api.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/space/hooks.ts`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/space/types.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/app/spaces/page.test.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/control-plane-v3/src/domains/space/hooks.test.ts`

**Step 1: Write the failing frontend tests**

Cover:

- the page loads spaces from the API instead of only stitching unrelated lists
- focused `agentId` or `eventId` highlights the matching space context
- members and timeline entries render from API data
- the old aggregate fallback does not silently replace missing API data

**Step 2: Run the focused frontend tests to verify they fail**

Run:

```bash
cd apps/control-plane-v3
npx vitest run src/app/spaces/page.test.tsx src/domains/space/hooks.test.ts
```

Expected: FAIL because the space domain client does not exist yet.

**Step 3: Write the minimal frontend implementation**

Add:

- `useSpaces`
- `useSpace`
- focused entry handling for `agentId` and `eventId`
- timeline and member rendering

Keep the existing visual language, but shift the data source to the new API.

**Step 4: Re-run the focused frontend tests and typecheck**

Run:

```bash
cd apps/control-plane-v3
npx vitest run src/app/spaces/page.test.tsx src/domains/space/hooks.test.ts
npm run typecheck
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/control-plane-v3/src/domains/space/api.ts apps/control-plane-v3/src/domains/space/hooks.ts apps/control-plane-v3/src/domains/space/types.ts apps/control-plane-v3/src/app/spaces/page.tsx apps/control-plane-v3/src/app/spaces/page.test.tsx apps/control-plane-v3/src/domains/space/hooks.test.ts
git commit -m "feat(spaces): back spaces page with persisted domain data"
```

## Task 4: Full Verification And Readiness Check

**Step 1: Run focused cross-domain verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_spaces_api.py apps/api/tests/test_spaces_timeline.py apps/api/tests/test_events_api.py apps/api/tests/test_tasks_api.py -q
cd apps/control-plane-v3 && npx vitest run src/app/spaces/page.test.tsx src/domains/space/hooks.test.ts
cd apps/control-plane-v3 && npm run typecheck
```

Expected: PASS.

**Step 2: Run the unified repository verification**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: PASS.

**Step 3: Report readiness**

State whether `/spaces` is now:

- a persisted operational domain
- source-of-truth backed
- still intentionally limited to non-chat V1 scope


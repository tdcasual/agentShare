# Project Optimization Roadmap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve the project's maintainability, consistency, operator UX, and production readiness over the next 1-8 weeks without destabilizing the already-merged front-end intake unification and backend intake catalog work.

**Architecture:** Treat optimization as a phased convergence effort rather than a rewrite. First eliminate duplicated contract logic between the API and web app, then harden test/runtime boundaries and application composition, and finally strengthen auth, operator tooling, and production observability. Each phase should leave the repository in a shippable state and add guardrails that prevent regressions.

**Tech Stack:** FastAPI, Next.js App Router, TypeScript, Pytest, Playwright, Postgres, Redis, Docker Compose, GitHub Actions.

---

## Current State Summary

**Current project score:** `8.6 / 10`

**What is already strong:**

- The product direction is coherent: secret-backed capabilities, tasks, approvals, and operator console all fit together well.
- The repository already has strong delivery hygiene: Docker images, deployment workflow, production compose baseline, and solid automated coverage.
- The latest merged work improved operator UX materially:
  - unified front-end intake forms are live in the web app;
  - the backend now exposes an intake catalog endpoint for structured metadata.

**What is holding the score below a 9+:**

- intake definitions still exist in more than one place, which creates a real long-term drift risk;
- end-to-end testing still depends on brittle local database lifecycle behavior;
- the FastAPI bootstrap path is still too centralized in a single entrypoint;
- management/operator auth is functional but still light for a serious multi-operator environment;
- operators still lack payload preview and reusable creation templates;
- observability is not yet deep enough for confident long-term production operations.

## Optimization Principles

### 1. Prefer convergence over replacement

Do not rewrite working surfaces if we can converge them behind a shared contract layer.

### 2. Ship guardrails before polish

If full unification cannot land immediately, add drift detection and verification first so duplication becomes visible instead of silent.

### 3. Improve operator trust

Every roadmap item should either reduce invalid configuration, improve debugging, or make production behavior easier to reason about.

## Priority Tier: Next 1 Week

### 1. Make intake definitions a single source of truth

**Why now:**

- This is the highest leverage improvement in the whole codebase.
- The repo now has both front-end contract registries and a backend intake catalog; leaving both authoritative will create divergence over time.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/intake_catalog.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/secrets-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/capabilities-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/tasks-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/agents-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/index.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_intake_catalog_api.py`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/contracts.test.ts`

**Recommended direction:**

- Choose one authoritative intake definition layer.
- Prefer the backend catalog as the durable source for variant metadata and field semantics.
- Keep the web app responsible for presentation-only concerns and light client-side validation adapters.

**Expected impact:**

- lower front-end/backend drift risk;
- easier future expansion for new secret, task, capability, and agent types;
- cleaner path to richer guided forms and server-driven templates.

**Success criteria:**

- a new intake variant is added once, not once per layer;
- web tests and API tests assert the same variant names and required fields;
- the console renders forms from shared or generated metadata instead of maintaining duplicate semantics by hand.

### 2. Add CI drift checking if full unification is not completed in the same sprint

**Why now:**

- If source-of-truth convergence slips, the repo still needs a guardrail immediately.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_intake_catalog_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/contracts.test.ts`

**Recommended direction:**

- Add a contract snapshot or diff check in CI that compares backend catalog variants against the web-layer variant registry.
- Fail fast when variant names, required fields, or options diverge.

**Expected impact:**

- stops silent schema drift;
- buys safe time if full unification needs to happen incrementally.

### 3. Clean up Playwright temporary database handling

**Why now:**

- The current E2E story passes, but temp database lifecycle remains a recurring source of fragility and local confusion.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/playwright.config.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/package.json`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/e2e`

**Recommended direction:**

- Ensure each Playwright run uses an isolated temp database path or clearly scoped test environment.
- Make cleanup explicit and deterministic.
- Avoid repo-root leftovers and reduce the chance of parallel/local collisions.

**Expected impact:**

- more reliable local and CI E2E runs;
- lower debugging overhead when tests fail intermittently.

## Priority Tier: Next 1 Month

### 4. Refactor FastAPI bootstrap into an app factory

**Why this matters:**

- `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/main.py` currently carries too much startup wiring responsibility.
- An app factory makes tests, environment-specific startup, and future background service integration much cleaner.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/main.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/config.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/conftest.py`

**Recommended direction:**

- Extract `create_app()` and move environment/config wiring behind explicit setup helpers.
- Keep route registration and middleware setup composable.
- Make test setup depend on the factory instead of importing a globally initialized app object.

**Expected impact:**

- simpler test composition;
- easier future staging/production specialization;
- cleaner extension point for metrics, tracing, and startup validation.

### 5. Strengthen the operator authentication and session model

**Why this matters:**

- The current management login flow is enough for a controlled environment, but it is not yet a strong foundation for multi-user operational access.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/login/page.tsx`

**Recommended direction:**

- Clarify session lifetime, invalidation rules, and operator identity boundaries.
- Introduce a more explicit operator model that can later support roles, audit attribution, and better admin workflows.
- Harden cookie/session handling and document expected production behavior.

**Expected impact:**

- stronger operational security baseline;
- better auditability;
- less future rework when access control becomes more sophisticated.

### 6. Add payload preview and reusable intake templates

**Why this matters:**

- The new unified forms are much better than before, but operators still need a clearer “what will actually be submitted” view.
- Reusable templates reduce repetitive configuration work and lower invalid submission rates.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/agent-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-form-renderer.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/intake_catalog.py`

**Recommended direction:**

- Render a live payload preview before submit.
- Allow operators to save or reuse starter templates for common variants.
- Keep templates variant-scoped so they stay understandable and safe.

**Expected impact:**

- higher operator confidence;
- fewer malformed payloads;
- faster repetitive setup workflows.

## Priority Tier: Later

### 7. Improve observability and production hardening depth

**Why this matters:**

- The project already has a credible deployment baseline, but it still needs stronger runtime visibility for long-term operation.

**Primary files and areas:**

- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/main.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/deploy.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`

**Recommended direction:**

- Add structured request logging, better error classification, and trace-friendly correlation IDs.
- Expand metrics from basic availability into operator-facing and runtime-facing signals.
- Add clearer deployment verification, rollback confidence, and production runbooks.

**Expected impact:**

- faster incident diagnosis;
- better confidence operating the system outside a tightly controlled dev environment;
- stronger readiness for broader usage.

## Recommended Execution Order

1. Unify intake definitions or make drift impossible to miss.
2. Clean Playwright temp database isolation so test feedback stays trustworthy.
3. Refactor FastAPI into an app factory to reduce architectural coupling before deeper hardening.
4. Strengthen operator auth and session boundaries once the backend composition is cleaner.
5. Add payload preview and reusable templates on top of the stabilized intake model.
6. Finish with observability and production hardening, when the application surfaces are more settled.

**Rationale:**

- The first two items reduce change risk immediately.
- The middle two items improve the architecture that future work will depend on.
- The last two items provide high product and operations value after the core shape is stable.

## If We Only Do 3 Things

### Top 3 highest-value moves

1. Make intake definitions a single source of truth.
2. Refactor the API bootstrap into an app factory.
3. Strengthen the operator auth and session model.

**Why these three:**

- Together they improve correctness, maintainability, and security at the foundation level.
- They create the cleanest base for all later UX and production improvements.

## Suggested First Sprint

### Sprint goal

Finish the intake convergence work far enough that new variants cannot drift silently, and leave the repo with cleaner test isolation than it has today.

### Sprint scope

**Track A: Intake convergence**

- Decide whether the backend catalog or generated shared metadata becomes authoritative.
- Reduce the web-layer form registries to presentation adapters wherever possible.
- Add tests that assert variant parity across API and web surfaces.

**Track B: Guardrails**

- Add CI checks for intake drift if complete convergence is not done in the sprint.
- Document how new intake variants must be added going forward.

**Track C: E2E stability**

- Make Playwright temp database setup deterministic.
- Ensure local cleanup behavior is explicit and CI-friendly.

### Sprint exit criteria

- The repository has a documented authoritative intake-definition flow.
- CI fails when intake metadata drifts.
- Playwright runs do not leave confusing temp state behind.
- The next resource variant can be added with materially less duplicated work than today.

## Delivery Risk Notes

- The largest risk is trying to redesign every intake detail at the same time as unification. Avoid that. Converge the source of truth first, then iterate on the UX.
- The auth work should not begin as a speculative RBAC rewrite. First define operator identity, session lifecycle, and audit attribution clearly.
- The observability work should not be postponed forever, but it should land after the app composition and auth boundaries are easier to instrument cleanly.

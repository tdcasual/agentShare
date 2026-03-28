# Project Improvement Master Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise the project from a strong `8.6 / 10` baseline to a more trustworthy and maintainable `9.2 / 10` by removing duplicated contract logic, improving test/runtime reliability, strengthening operator auth, improving operator UX, and deepening observability and delivery guardrails.

**Architecture:** Treat this as a convergence program, not a rewrite. First eliminate the highest-leverage long-term risk: duplicated intake metadata across API and web. Then make the local and CI execution environments more deterministic, continue cleaning application composition boundaries, and harden management/operator identity. Only after those foundations are stable should we spend more effort on operator-facing UX upgrades and deeper production observability. Finish by cleaning repo-wide quality guardrails and separating what should stay in-repo from what belongs in platform infrastructure.

**Tech Stack:** FastAPI, Next.js App Router, React 19, TypeScript, Pytest, Playwright, SQLAlchemy, Alembic, Postgres, Redis, Docker Compose, GitHub Actions.

---

## Current State

### What is already strong

- Product shape is coherent: secrets, capabilities, tasks, approvals, runs, and playbooks reinforce the same control-plane story.
- Delivery hygiene is ahead of the average internal tool repository: CI, image builds, deploy workflow, smoke checks, ops docs, and security scan are already present.
- The backend recently improved in meaningful ways: runtime scoping, Alembic, fail-fast production config, structured domain errors, and safer identifiers are already merged.
- The web app already has a credible interaction model, responsive behavior, bilingual copy, and Playwright coverage for key operator paths.

### What is keeping the score below 9+

- Intake definitions still exist in more than one place.
- Local and CI runtime assumptions are still more fragile than they should be.
- Management/operator auth is functional but still too light for a serious multi-operator environment.
- Observability exists, but it is still baseline rather than operator-grade.
- Repo-wide engineering guardrails are uneven; some quality layers are strong while others are implicit or missing.

## Target Outcomes

By the end of this plan, the repository should meet these outcomes:

1. A new intake variant is added in one authoritative place, not multiple places.
2. Playwright, API tests, and CI can run without depending on ad hoc local environment quirks.
3. FastAPI composition is explicit enough that runtime wiring, tests, and future staging/production specializations are easy to reason about.
4. Management sessions carry a clearer operator identity model and stronger cookie/session guarantees.
5. Operators can preview submitted payloads and reuse safe intake templates.
6. Request logs, metrics, deploy checks, and production docs are rich enough to support routine operations and faster incident response.
7. The repo has clearer quality guardrails around type checking, dead layers, and repeatable verification.

## Score Targets

- Maintainability: `8.0 -> 9.1`
- Test reliability: `9.1 -> 9.4`
- Security / operator trust: `8.2 -> 9.0`
- Frontend operator UX: `8.7 -> 9.1`
- Observability / ops confidence: `8.0 -> 9.0`
- Overall: `8.6 -> 9.2`

## Execution Principles

- Do not implement this plan on `main`. Use an isolated worktree and phase-specific branch names.
- Prefer convergence over replacement. Reuse current routes, current server actions, and current page structure wherever possible.
- Follow TDD for every behavior change: failing test first, then minimal implementation, then green verification.
- Keep commits phase-aligned. Do not mix intake convergence, auth hardening, and observability in one commit.
- Every phase must end with fresh verification evidence before moving forward.

## Recommended Timeline

- Week 1: Task 1 and Task 2
- Week 2: Task 3 and Task 4
- Week 3: Task 5 and Task 6
- Week 4: Task 7 and Task 8

If time is constrained, complete Tasks 1, 4, and 6 first.

## Task 1: Make Intake Metadata Truly Single-Source

**Why this is first:**

- This is the biggest long-term maintenance risk in the whole repo.
- It directly affects correctness, speed of future feature work, and operator UX consistency.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/intake_catalog.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_intake_catalog_api.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/api.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/index.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/secrets-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/capabilities-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/tasks-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/agents-contracts.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/agent-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/secrets/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/capabilities/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/tasks/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/agents/page.tsx`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/contracts.test.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/forms/__tests__/catalog-adapter.test.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-variants.spec.ts`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/check-intake-drift.py`

**Step 1: Freeze current parity with tests**

- Tighten API catalog tests so they assert stable variant ids, field semantics, and read-only/default metadata.
- Add or expand web adapter tests so the backend catalog can be normalized into renderer-ready contracts.
- Extend Playwright coverage to prove management pages read their variants from the API catalog rather than local static definitions.

**Step 2: Move authoritative metadata to the backend catalog**

- Keep the API catalog authoritative for variant ids, labels, defaults, sections, and control metadata.
- Reduce web-side resource files to serializer logic, client-side validation, and live-option augmentation only.
- For capability forms, keep secret inventory injection as a web concern, but do not let it reintroduce authoritative field metadata.

**Step 3: Turn drift checks into a hard guardrail**

- Make `scripts/check-intake-drift.py` compare the backend catalog and web adapters for every resource kind.
- Keep `apps/web/package.json` exposing the check through `npm run test:contracts`.
- Keep CI failing when variant ids diverge or when the drift check is removed.

**Verification:**

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_intake_catalog_api.py -q
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npm run test:contracts
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npx tsx --test lib/forms/__tests__/catalog-adapter.test.ts lib/forms/__tests__/contracts.test.ts
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npx playwright test tests/intake-variants.spec.ts
```

**Done when:**

- A new variant can be added without duplicating authoritative labels/defaults in both API and web.
- The management pages build forms from the API catalog.
- Drift detection is enforced in CI.

## Task 2: Remove Test and Runtime Fragility

**Why this is second:**

- The repo already has strong test coverage; the next win is making those tests more deterministic and easier for anyone on the team to run.
- Reliability work compounds every future task.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/playwright.config.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/setup/test-db.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/setup/test-db.test.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/conftest.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_alembic_migrations.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/ci.yml`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/ops/bootstrap-dev-runtime.sh`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`

**Step 1: Make local test prerequisites explicit**

- Replace implicit runtime discovery where possible with explicit bootstrap steps or a checked script.
- Standardize how Playwright finds and launches the API runtime.
- Ensure the repo clearly documents how `.venv`, migrations, and web test prerequisites are established.

**Step 2: Make database lifecycle deterministic**

- Continue using isolated per-run databases, but make setup/cleanup and migration behavior explicit.
- Reduce dependence on hidden local state.
- Ensure the same preparation model works locally and in CI.

**Step 3: Keep CI aligned with local execution**

- CI should prove the same migration-first and runtime boot assumptions that developers use locally.
- Avoid “works in CI only” or “works locally only” flows.

**Verification:**

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_alembic_migrations.py apps/api/tests tests/ops -q
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npx tsx --test tests/setup/test-db.test.ts
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npx playwright test
```

**Done when:**

- A new contributor can run the main test stack from explicit documented steps.
- Playwright does not depend on fragile local discovery patterns alone.
- CI and local setup are materially closer.

## Task 3: Finish Backend Composition Cleanup

**Why this matters:**

- Recent runtime/factory refactors moved the codebase in the right direction.
- The remaining goal is to make app wiring and dependency flow more explicit and less reliant on fallback globals.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/main.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/db.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/dependencies.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/__init__.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/conftest.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_app_factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_runtime.py`

**Step 1: Tighten tests around composition boundaries**

- Assert that test setup depends on `create_app()` rather than implicit app-global side effects.
- Expand tests around runtime injection and request-scoped dependencies.

**Step 2: Reduce global fallback behavior**

- Keep only the minimum necessary defaults for direct script compatibility.
- Prefer explicit runtime access through `request.app.state.runtime` and dependency helpers.

**Step 3: Keep route and middleware setup composable**

- Make it easy to enable, disable, or specialize routes and middleware in future staging or background-task variants.

**Verification:**

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_app_factory.py apps/api/tests/test_runtime.py apps/api/tests/test_startup_fail_fast.py -q
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests -q
```

**Done when:**

- Test setup does not rely on surprising global state.
- Runtime wiring is easy to trace from `main.py` through `create_app()` into dependencies.
- Future specialization work would not require a factory rewrite.

## Task 4: Strengthen Operator Identity and Session Trust

**Why this is high priority:**

- The current bootstrap-to-admin-session flow is acceptable for a controlled environment, but not a durable operator access model.
- This work improves security, auditability, and future role-based evolution.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/session.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/services/session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/schemas/sessions.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_session_auth.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_management_session_service.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/login/page.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/management-session.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/agent-quickstart.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`

**Step 1: Define a clearer operator identity model**

- Make session payloads and auth helpers explicitly describe operator id, role, session issue time, expiry, and invalidation semantics.
- Prepare the schema for future multi-operator support without requiring SSO in this phase.

**Step 2: Harden cookie and session behavior**

- Clarify secure-cookie requirements, failure modes, expiry behavior, and logout semantics.
- Make session-related docs and tests prove the intended production behavior.

**Step 3: Improve audit readability**

- Ensure audit events and auth responses carry enough identity context for later investigation and operator support.

**Verification:**

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_session_auth.py apps/api/tests/test_management_session_service.py -q
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npx playwright test tests/management-session.spec.ts
```

**Done when:**

- Session semantics are documented and test-backed.
- The management identity model is clearer than “bootstrap login implies generic admin.”
- Production security docs explain operator trust boundaries more concretely.

## Task 5: Improve Operator UX for Form Confidence and Reuse

**Why now:**

- After metadata convergence and auth hardening, the next best value is reducing operator error rates and repetitive setup work.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-form-renderer.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-payload-preview.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/forms/intake-template-menu.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/secrets-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/capability-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/task-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/components/agent-form.tsx`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/app/actions.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-preview.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/intake-variants.spec.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tests/ui-review.spec.ts`

**Step 1: Make payload consequences obvious**

- Ensure every resource form can show a trustworthy preview of the normalized payload before submit.
- Keep the preview close to the form and variant state, not hidden behind a secondary navigation flow.

**Step 2: Make common setups reusable**

- Keep starter templates scoped by resource kind and variant.
- Optimize for repeatable safe defaults, not fully arbitrary saved drafts in this phase.

**Step 3: Prove UX behavior with tests**

- Keep unit coverage around serialization and template hydration.
- Keep Playwright coverage for preview updates, variant switching, and template application.

**Verification:**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npm run test:unit
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npx playwright test tests/intake-preview.spec.ts tests/intake-variants.spec.ts tests/ui-review.spec.ts
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npm run build
```

**Done when:**

- Operators can understand what will be submitted before they click submit.
- Repeated creation workflows are faster and less error-prone.
- UI review tests continue to enforce the current product tone and information hierarchy.

## Task 6: Deepen Observability and Production Confidence

**Why this is critical:**

- The deploy baseline is already strong enough that lack of visibility is now the bigger limitation.
- This phase should make incidents easier to detect, explain, and recover from.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/observability.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/factory.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/app/routes/metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_observability_logging.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/api/tests/test_metrics.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/deploy.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/scripts/ops/smoke-test.sh`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_container_artifacts.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_security_artifacts.py`

**Step 1: Expand metrics beyond “up” and raw request counts**

- Track higher-value counters such as approvals created, capability invokes by outcome, session auth failures, and task state transitions.
- Keep metric naming clear and Prometheus-friendly.

**Step 2: Improve structured request and failure logging**

- Ensure request logs, error classes, and request ids are easy to correlate.
- Make failure categories visible enough for incident triage without leaking secrets.

**Step 3: Strengthen deploy-time confidence**

- Extend smoke checks and deploy docs so rollback and post-deploy verification are more explicit.
- Keep ops tests proving that the documented production controls remain in the repo.

**Verification:**

```bash
PYTHONPATH=apps/api .venv/bin/pytest apps/api/tests/test_observability_logging.py apps/api/tests/test_metrics.py tests/ops/test_container_artifacts.py tests/ops/test_security_artifacts.py -q
docker compose config >/tmp/agentshare-compose-check.out
```

**Done when:**

- Operators can answer “what failed?”, “where?”, and “how often?” without source diving.
- Deploy and rollback steps are clearer and better proven.
- Metrics and docs are aligned with real operations work.

## Task 7: Add Repo-Wide Quality Guardrails and Remove Dead Layers

**Why this matters:**

- The repo has strong test culture, but it still relies on some implicit quality practices instead of explicit guardrails.
- This phase prevents entropy from creeping back in.

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/.editorconfig`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/eslint.config.mjs`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/package.json`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/tsconfig.json`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/.github/workflows/ci.yml`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/design-tokens.ts`
- Modify or Delete: `/Users/lvxiaoer/Documents/codeWork/agentShare/apps/web/lib/theme.ts`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`

**Step 1: Add light but explicit quality gates**

- Add a typecheck script for the web app if it is not already present.
- Add linting only where the rule set is small, high-signal, and maintainable.
- Keep CI focused on checks the team will actually honor.

**Step 2: Resolve dead or misleading frontend layers**

- Audit `design-tokens.ts`, `theme.ts`, and similar utility layers.
- Either wire them into the real styling system or remove/de-scope them so the codebase tells the truth.

**Step 3: Document the quality floor**

- Update the README so contributors know which commands define a clean repo state.

**Verification:**

```bash
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npm run build
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npm run test:unit
cd /Users/lvxiaoer/Documents/codeWork/agentShare/apps/web && npm run test:contracts
```

**Done when:**

- The repo has a clearer definition of “clean enough to merge.”
- Dead or misleading frontend abstraction layers are either real or gone.
- Quality expectations are written down, not implied.

## Task 8: Separate In-Repo Improvements from Platformization Work

**Why include this explicitly:**

- Some remaining score gap is not solvable inside the app repo alone.
- The team needs a clear handoff line between application work and platform ownership.

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-roadmap.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-deployment.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`

**Step 1: Clarify what “done” means inside this repo**

- Keep the repo responsible for app code, images, single-host baseline, smoke tests, and operator docs.

**Step 2: Clarify what belongs outside this repo**

- Managed Postgres and Redis, secret backend lifecycle, SSO, centralized alerting, and HA failover should remain platform work items.

**Step 3: Turn the platform backlog into explicit exit criteria**

- Keep the roadmap concrete enough that leadership understands what still blocks a higher “platform maturity” score.

**Verification:**

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_roadmap.py -q
```

**Done when:**

- The app team and platform team have a cleaner responsibility boundary.
- “Why isn’t this a 9.8 yet?” has a concrete documented answer.

## Milestones

### Milestone A: Repository Trust Floor

Complete:

- Task 1
- Task 2

Expected result:

- lower drift risk;
- more trustworthy local and CI feedback;
- easier future implementation speed.

### Milestone B: Operator Trust Floor

Complete:

- Task 3
- Task 4

Expected result:

- cleaner backend composition;
- stronger session semantics;
- better auditability.

### Milestone C: Product and Operations Confidence

Complete:

- Task 5
- Task 6

Expected result:

- more confident operators;
- fewer malformed submissions;
- better incident diagnosis and deploy confidence.

### Milestone D: Sustainable Scaling

Complete:

- Task 7
- Task 8

Expected result:

- clearer quality expectations;
- less dead abstraction;
- a sharper boundary between application maturity and platform maturity.

## If We Only Do 3 Things

1. Complete Task 1 so intake metadata stops drifting.
2. Complete Task 4 so operator trust and future access control stop depending on a thin bootstrap-session story.
3. Complete Task 6 so production behavior is easier to observe and defend.

## Final Recommendation

Start with a dedicated worktree and execute this plan in four batches:

1. Task 1 and Task 2
2. Task 3 and Task 4
3. Task 5 and Task 6
4. Task 7 and Task 8

Do not start with cosmetic cleanup. The highest-leverage path is:

- converge metadata;
- stabilize execution;
- harden trust boundaries;
- improve operator confidence;
- then polish long-term guardrails.

# Platform Handoff Package Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce a truthful platform handoff package that clearly separates repository-owned trial-run readiness from platform-owned enterprise readiness, with explicit migration responsibilities for identity, stateful services, HA, and observability.

**Architecture:** Treat this work as a documentation and operational-boundary package, not as hidden infrastructure implementation. First add failing docs/tests that define the required handoff coverage. Then produce the checklist, ownership matrix, and readiness thresholds. Finally wire the new boundary docs into the existing roadmap and operational guides so the repo no longer implies ownership it does not have.

**Tech Stack:** Markdown documentation, pytest ops tests, repository runbooks.

---

## Read Before Implementing

- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-02-control-plane-architecture-design.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/plans/2026-04-02-operator-identity-and-policy-design.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-roadmap.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`
- `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_platform_roadmap.py`

## Scope

- In scope:
  - explicit platform handoff checklist
  - ownership boundary for SSO, Postgres, Redis, secret backend, HA, and alerting
  - trial-run ready versus enterprise-ready definitions
  - verification tests for docs coverage
  - README and runbook references to the new handoff package
- Out of scope:
  - actually implementing SSO
  - provisioning managed infrastructure
  - adding HA orchestration
  - deploying centralized monitoring infrastructure

## Task 1: Add Failing Coverage Tests For The Handoff Package

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_platform_handoff_docs.py`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_platform_roadmap.py`

**Step 1: Write the failing ops doc tests**

Assert that the docs explicitly cover:

- managed Postgres migration ownership
- managed Redis migration ownership
- external secret backend lifecycle ownership
- SSO ownership boundary
- HA failover ownership
- centralized alerting and incident escalation ownership
- `trial-run ready` criteria
- `enterprise-ready` criteria

**Step 2: Run the focused tests to verify they fail**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_handoff_docs.py tests/ops/test_platform_roadmap.py -q
```

Expected: FAIL because the dedicated handoff package does not exist yet.

**Step 3: Commit the failing test work only if your workflow requires red-green checkpoints**

If you do not commit failing tests in this repo, skip this step.

## Task 2: Write The Platform Handoff Checklist And Ownership Matrix

**Files:**
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-handoff-checklist.md`
- Create: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-ownership-matrix.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/platform-roadmap.md`

**Step 1: Write the minimal handoff package**

Document:

- what the repository already guarantees
- what the platform team must provide
- who owns each production-critical dependency
- migration order from single-host trial run to enterprise deployment
- exit criteria for both readiness thresholds

Use clear sections for:

- identity
- data services
- secrets
- ingress and HA
- observability and incidents

**Step 2: Re-run the focused tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_handoff_docs.py tests/ops/test_platform_roadmap.py -q
```

Expected: PASS.

**Step 3: Commit**

```bash
git add docs/guides/platform-handoff-checklist.md docs/guides/platform-ownership-matrix.md docs/guides/platform-roadmap.md tests/ops/test_platform_handoff_docs.py tests/ops/test_platform_roadmap.py
git commit -m "docs(platform): add handoff package and ownership matrix"
```

## Task 3: Wire The New Boundary Into Existing Ops And Release Docs

**Files:**
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-operations.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/docs/guides/production-security.md`
- Modify: `/Users/lvxiaoer/Documents/codeWork/agentShare/README.md`
- Test: `/Users/lvxiaoer/Documents/codeWork/agentShare/tests/ops/test_platform_handoff_docs.py`

**Step 1: Add the minimal doc references**

Update the existing docs so they clearly point operators to:

- the trial-run baseline
- the platform handoff checklist
- the ownership matrix
- the distinction between app-owned and platform-owned responsibilities

Do not duplicate the whole handoff package into every file. Link cleanly and keep each doc truthful to its own scope.

**Step 2: Re-run the focused tests**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_handoff_docs.py -q
```

Expected: PASS.

**Step 3: Commit**

```bash
git add docs/guides/production-operations.md docs/guides/production-security.md README.md tests/ops/test_platform_handoff_docs.py
git commit -m "docs(ops): wire platform handoff boundaries into runbooks"
```

## Task 4: Final Verification And Handoff Summary

**Step 1: Run the full docs and repo verification**

Run:

```bash
PYTHONPATH=apps/api .venv/bin/pytest tests/ops/test_platform_handoff_docs.py tests/ops/test_platform_roadmap.py -q
./scripts/ops/verify-control-plane.sh
```

Expected: PASS.

**Step 2: Produce the handoff summary**

Summarize in two blocks:

- `Repository-owned trial-run baseline`
- `Platform-owned enterprise readiness work`

Call out any remaining ambiguity separately as a blocker rather than hiding it inside prose.

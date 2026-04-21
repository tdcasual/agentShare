# Deployment Docs Wrap-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clarify the repository's supported deployment paths so operators do not confuse the Coolify compose stack with the hardened standalone production stack.

**Architecture:** Keep the existing deployment topology unchanged. Improve the docs by making the choice between `docker-compose.coolify.yml` and `docker-compose.prod.yml` explicit, documenting manual deploy and smoke-check steps, and aligning cross-references across the operator guides.

**Tech Stack:** Markdown documentation, Docker Compose, GitHub Actions deploy workflow, shell smoke test

---

### Task 1: Audit the current deployment docs

**Files:**
- Modify: `docs/guides/deployment-manual.md`
- Modify: `docs/guides/coolify-deployment.md`
- Modify: `docs/guides/production-deployment.md`
- Reference: `docker-compose.coolify.yml`
- Reference: `docker-compose.prod.yml`
- Reference: `ops/compose/coolify.env.example`
- Reference: `ops/compose/prod.env.example`
- Reference: `scripts/ops/smoke-test.sh`

**Step 1: Identify doc drift**

- Confirm which guide currently points plain `docker compose` users at the Coolify compose stack.
- Confirm the hardened single-host path is documented with `docker-compose.prod.yml` and the smoke script.
- Confirm env examples and compose files support the documented commands.

**Step 2: Define the doc changes**

- Add a deployment-path selection section to the operator manual.
- Add a manual `docker-compose.prod.yml` deployment sequence.
- Clarify that `docker-compose.coolify.yml` without Coolify is only for private or externally fronted ingress, not a standalone public-TLS baseline.

### Task 2: Rewrite the operator deployment manual

**Files:**
- Modify: `docs/guides/deployment-manual.md`

**Step 1: Add a path-selection section**

- Document the three supported choices:
  - Coolify + `docker-compose.coolify.yml`
  - plain `docker compose` + `docker-compose.coolify.yml` with external ingress already handled elsewhere
  - hardened public single-host baseline + `docker-compose.prod.yml`

**Step 2: Add a hardened manual deployment flow**

- Include exact commands to prepare `.env.production`, set `API_IMAGE` and `WEB_IMAGE`, validate compose, pull, start, and run `scripts/ops/smoke-test.sh`.

**Step 3: Tighten post-deploy verification**

- Add the authenticated smoke-test command and explain the required env vars.

### Task 3: Align the shorter deployment guides

**Files:**
- Modify: `docs/guides/coolify-deployment.md`
- Modify: `docs/guides/production-deployment.md`

**Step 1: Clarify Coolify boundaries**

- State clearly that `docker-compose.coolify.yml` is not, by itself, the hardened standalone public ingress stack when Coolify is absent.

**Step 2: Align production guide references**

- Point operators at `deployment-manual.md` for the full end-to-end procedure.
- Mention the manual `docker compose` alternative in addition to the GitHub Actions deploy workflow.

### Task 4: Verify and commit

**Files:**
- Modify if needed: touched docs only

**Step 1: Verify**

Run:

```bash
./scripts/ops/verify-control-plane.sh
```

Expected: full repository verification passes after doc edits.

**Step 2: Commit**

```bash
git add docs/guides/deployment-manual.md docs/guides/coolify-deployment.md docs/guides/production-deployment.md docs/plans/2026-04-21-deployment-docs-wrap-up-plan.md
git commit -m "docs: clarify deployment paths and runbooks"
```

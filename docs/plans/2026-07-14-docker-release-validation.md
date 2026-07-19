# Docker Release Validation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install Docker, validate VaultGate with real containers and PostgreSQL, complete security/quality audits, then commit and merge the verified release candidate into `main`.

**Architecture:** Preserve the current dirty `main` work on a temporary release branch. Use the repository's Compose topology to build and run API, web, PostgreSQL, and Caddy, exercise the public trust boundaries and data path, then update the audit report with fresh evidence before Git integration.

**Tech Stack:** Docker Engine, Docker Compose v2, PostgreSQL, FastAPI, Next.js, Alembic, pytest, Vitest, Playwright, Trivy.

---

### Task 1: Isolate and install Docker

1. Create `release/vaultgate-architecture-convergence` from the current dirty `main` worktree.
2. Inspect Ubuntu package candidates for Docker Engine and Compose v2.
3. Install the supported packages and enable the daemon.
4. Verify engine, Compose, BuildKit, and an isolated `hello-world` container.

### Task 2: Validate container artifacts

1. Render development and production Compose models with validation environment values.
2. Build the API, web, Caddy, and PostgreSQL images without relying on local language environments.
3. Inspect image users, health checks, and vulnerability scan results.
4. Start an isolated Compose project and wait for all health checks.

### Task 3: Validate PostgreSQL and trust boundaries

1. Confirm the API startup applies Alembic migrations to PostgreSQL.
2. Exercise bootstrap, browser Session, admin Secret/Agent/Token/Grant APIs, and `vg_` Vault reads.
3. Verify default deny, `vg_`/`vgm_` boundary rejection, audit persistence, revoke behavior, and Caddy security headers.
4. Restart services and verify data persistence, readiness, and backup behavior.

### Task 4: Run complete release gates

1. Run Ruff, mypy, Bandit, API tests, Alembic checks, and ops tests.
2. Run frontend type/lint/format, unit/coverage, E2E, production build, and npm audit.
3. Run Python lock-file audit, Trivy image scans, Compose validation, and `git diff --check`.
4. Record exact results and any external limitations in `docs/audits/2026-07-14-release-audit.md`.

### Task 5: Commit and merge

1. Review the complete diff and exclude generated/runtime artifacts.
2. Commit the architecture convergence and release-validation changes on the release branch.
3. Switch to `main` and merge the release branch with a merge commit.
4. Re-run post-merge smoke and repository status checks without pushing remotely.

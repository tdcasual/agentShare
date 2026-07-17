# Error Log

## [ERR-20260713-001] backend-quality-gates

**Logged**: 2026-07-13T13:12:31Z
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Backend tests and static/security checks cannot run from a fresh repository checkout without creating the documented development environment.

### Error

```text
RuntimeError: The starlette.testclient module requires the httpx package to be installed.
/usr/bin/python3: No module named ruff
/usr/bin/python3: No module named mypy
/usr/bin/python3: No module named bandit
```

### Context
- Commands attempted: `python3 -m pytest -q`, `python3 -m ruff check app tests`, `python3 -m mypy app`, and `python3 -m bandit -q -r app`.
- The repository had no local `.venv`; system Python contained runtime packages but not the complete development toolchain.
- The failure occurs before project tests execute and is environmental, not yet evidence of an application defect.

### Suggested Fix
Create `.venv`, install `apps/api[dev]`, and make the canonical verification script or contributor documentation bootstrap/check that environment explicitly.

### Resolution
The dev extra now declares the TestClient transport, deployment and verification use the canonical environment, and clean-environment API collection/tests have been verified.

### Metadata
- Reproducible: yes
- Related Files: `README.md`, `apps/api/pyproject.toml`, `scripts/ops/verify-control-plane.sh`

---

## [ERR-20260717-003] compose-static-ip-collision

**Logged**: 2026-07-17T04:02:00Z
**Priority**: critical
**Status**: resolved
**Area**: operations

### Summary
The production Compose stack could not start Caddy because Docker dynamically assigned Caddy's fixed `172.30.0.2` address to API before Caddy started.

### Error

```text
Error response from daemon: failed to set up container networking: Address already in use
```

### Context
- Caddy uses a fixed address so API can trust only the reverse proxy for forwarded client IPs.
- API starts before Caddy because Caddy depends on API health.
- The edge network's dynamic pool included the fixed Caddy address.

### Suggested Fix
Reserve a non-overlapping dynamic allocation range while keeping Caddy's trusted static address inside the network subnet.

### Metadata
- Reproducible: yes
- Related Files: `docker-compose.prod.yml`, `tests/ops/test_security_artifacts.py`

### Resolution
- **Resolved**: 2026-07-17T04:02:00Z
- **Notes**: Restricted dynamic edge allocations to `172.30.0.128/25` and added an operations regression assertion.

---

## [ERR-20260717-002] python-version-mypy-drift

**Logged**: 2026-07-17T03:40:00Z
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
The release CI failed because mypy under the supported Python 3.12 environment reported errors that were not reproduced by the host Python 3.14 environment.

### Error

```text
app/idempotency.py:121: error: Returning Any from function declared to return "dict[str, Any] | None"
app/modules/admin_auth/routes.py:237: error: Unused "type: ignore" comment
app/modules/admin_auth/routes.py:270: error: Unused "type: ignore" comment
```

### Context
- CI installs the locked mypy 2.3.0 environment on Python 3.12.
- The local host used the same mypy version with Python 3.14, whose type analysis did not expose the same diagnostics.

### Suggested Fix
Run release static analysis in the minimum supported Python version and validate decoded JSON before narrowing it to the declared response type.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/app/idempotency.py`, `apps/api/app/modules/admin_auth/routes.py`

### Resolution
- **Resolved**: 2026-07-17T03:40:00Z
- **Notes**: Added runtime JSON-object validation, explicit narrowing, and removed obsolete suppressions.

---

## [ERR-20260717-001] git-ref-write-restricted

**Logged**: 2026-07-17T00:00:00Z
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
Creating the release branch failed because the managed workspace exposes `.git` as read-only inside the default sandbox.

### Error

```text
fatal: cannot lock ref 'refs/heads/release/vaultgate-hardening-20260717'
```

### Context
- The working tree itself remained writable and unchanged.
- Git metadata mutations require controlled escalation in this environment.

### Suggested Fix
Run branch, commit, and merge commands with the managed Git escalation path.

### Metadata
- Reproducible: yes
- Related Files: `.git/refs/heads`

### Resolution
- **Resolved**: 2026-07-17T00:00:00Z
- **Notes**: Retried the Git workflow with scoped elevated permissions.

---

## [ERR-20260715-006] host-python312-unavailable

**Logged**: 2026-07-15T00:24:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The host did not provide a `python3.12` executable for a clean locked-dependency test environment.

### Error

```text
zsh: command not found: python3.12
```

### Resolution
Used the freshly built Python 3.12 API image as an ephemeral test runner. The complete backend suite passed with the coverage gate satisfied.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/requirements-dev.lock`, `apps/api/Dockerfile`

---

## [ERR-20260715-005] dependency-audit-restricted-endpoints

**Logged**: 2026-07-15T00:18:00Z
**Priority**: low
**Status**: resolved
**Area**: security

### Summary
Dependency audits failed in the default sandbox because the configured npm mirror does not implement the audit endpoint and pip-audit could not prepare its temporary environment.

### Error

```text
npm audit 404 [NOT_IMPLEMENTED]
pip-audit: Failed to upgrade pip, wheel, setuptools
```

### Resolution
Used the official npm registry and approved external access for pip-audit. Both audits completed with zero known vulnerabilities.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/package-lock.json`, `apps/api/requirements.lock`

---

## [ERR-20260715-004] next-build-sandbox-port-denied

**Logged**: 2026-07-15T00:12:00Z
**Priority**: low
**Status**: resolved
**Area**: build

### Summary
Next.js Turbopack could not run the PostCSS worker inside the restricted sandbox because local port binding was denied.

### Error

```text
creating new process
binding to a port
Operation not permitted (os error 1)
```

### Resolution
Re-ran the approved `npm run build` command outside the sandbox; the production build completed successfully.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/src/app/globals.css`

---

## [ERR-20260715-003] generated-type-prettier-plugin-resolution

**Logged**: 2026-07-15T00:07:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
Formatting the generated OpenAPI file from the repository root prevented Prettier from resolving the frontend-local Tailwind plugin.

### Error

```text
Cannot find package 'prettier-plugin-tailwindcss' imported from .../noop.js
```

### Resolution
Run the generated-file formatting step from `apps/control-plane-v3`, where the plugin is installed.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/package.json`

---

## [ERR-20260715-002] openapi-typescript-stdin-argument

**Logged**: 2026-07-15T00:05:00Z
**Priority**: low
**Status**: resolved
**Area**: tooling

### Summary
`openapi-typescript` 7.13 treated `-` as a literal file path instead of standard input.

### Error

```text
ResolveError: ENOENT: no such file or directory '.../control-plane-v3/-'
```

### Resolution
Use `/dev/stdin` as the schema input path for the OpenAPI generation pipeline.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/package.json`

---

## [ERR-20260715-001] npm-registry-dns-in-sandbox

**Logged**: 2026-07-15T00:02:00Z
**Priority**: low
**Status**: resolved
**Area**: dependencies

### Summary
Installing the OpenAPI type generator failed inside the restricted sandbox because the configured npm mirror could not be resolved.

### Error

```text
npm ERR! code EAI_AGAIN
npm ERR! request to https://registry.npmmirror.com/openapi-typescript failed
```

### Context
- Existing frontend checks and dependencies were unaffected.
- The same scoped install succeeded after the required network escalation.

### Suggested Fix
Retry dependency downloads with approved network access when DNS failure is sandbox-related.

### Resolution
Installed `openapi-typescript` with the approved `npm install --save-dev` prefix.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/package.json`, `apps/control-plane-v3/package-lock.json`

---

## [ERR-20260715-001] ruff-import-order-after-schema-edit

**Logged**: 2026-07-15T06:27:59Z
**Priority**: low
**Status**: resolved
**Area**: backend

### Summary
Adding a module-level password limit helper left the import block outside Ruff's expected grouping.

### Error

```text
I001 Import block is un-sorted or un-formatted
```

### Context
- The behavior and focused tests passed; only the import-order quality gate failed.
- The issue occurred in `apps/api/app/modules/admin_auth/schemas.py` after a manual patch.

### Suggested Fix
Run Ruff formatting on each edited Python module before broader verification.

### Resolution
Applied Ruff's import organizer and reran the focused quality gate.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/app/modules/admin_auth/schemas.py`

---

## [ERR-20260715-002] uv-python312-resolution-network

**Logged**: 2026-07-15T06:29:00Z
**Priority**: low
**Status**: pending
**Area**: infra

### Summary
Generating a Python 3.12 development lock with uv stalled while downloading the managed CPython interpreter.

### Error

```text
Downloading cpython-3.12.13-linux-x86_64-gnu (download) (32.6MiB)
```

The process produced no further output and was stopped after a bounded wait.

### Context
- The sandbox initially blocked uv's cache directory; an approved elevated retry reached the download step.
- No repository files were changed by uv.

### Suggested Fix
Use a preinstalled Python 3.12 toolchain or a CI cache for lock generation; do not make local verification depend on a live interpreter download.

### Metadata
- Reproducible: unknown
- Related Files: `apps/api/requirements.lock`, `scripts/ops/bootstrap-dev-runtime.sh`

---

## [ERR-20260715-003] synthetic-flow-csrf-origin

**Logged**: 2026-07-15T08:05:00Z
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The first real Compose synthetic flow used a different browser origin than the API CSRF allowlist.

### Error

```text
Expected Secret creation status 201, received 403
```

### Context
- The test used `http://127.0.0.1:3000` while the development Compose default allowed `http://localhost:3000`.
- The disposable stack was removed, including its PostgreSQL volume, after the failure.

### Suggested Fix
Derive both the API `CORS_ALLOWED_ORIGINS` value and Playwright base URL from one synthetic-flow variable.

### Resolution
The synthetic runner now injects the same `SYNTHETIC_BASE_URL` into Compose and Playwright.

### Metadata
- Reproducible: yes
- Related Files: `scripts/ops/run-synthetic-flow.sh`, `apps/control-plane-v3/test/integration/vaultgate.synthetic.spec.ts`

---

## [ERR-20260715-001] python-raw-string-test-fixture

**Logged**: 2026-07-15T00:00:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A literal backslash search fixture used an invalid Python raw string ending in a single backslash.

### Error

```text
Expected `)`, found name
```

### Context
- Ruff could not parse `apps/api/tests/test_admin_api.py` after adding literal LIKE wildcard coverage.
- Python raw strings cannot end with an odd number of backslashes.

### Suggested Fix
Use a regular escaped string (`"\\\\"`) when the intended value is one trailing backslash.

### Resolution
Replaced the invalid raw string and reran Ruff before the broader test suite.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/tests/test_admin_api.py`

---

## [ERR-20260714-008] jsdom-domexception-and-clipboard-mocks

**Logged**: 2026-07-14T15:47:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Node/jsdom browser API objects require structural error checks and getter spies in frontend tests.

### Error

```text
DOMException did not satisfy instanceof Error; navigator.clipboard has only a getter
```

### Context
- Proxy timeout classification relied on `error instanceof Error` before reading `name`.
- Clipboard failure testing attempted to assign directly to jsdom's read-only Navigator getter.

### Suggested Fix
Read the `name` property structurally from unknown errors and mock browser getter APIs with `vi.spyOn(..., 'get')`.

### Resolution
Updated timeout classification and the clipboard failure test with environment-independent patterns.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/src/app/api/[...path]/route.ts`, `apps/control-plane-v3/src/features/secrets/secret-reveal-dialog.test.tsx`

---

## [ERR-20260714-014] frontend-source-root-assumption

**Logged**: 2026-07-14T11:41:20Z
**Priority**: low
**Status**: resolved
**Area**: frontend

### Summary
The initial frontend audit search assumed `src/` existed at the repository root, but the frontend is under `apps/control-plane-v3/`.

### Error

```text
rg: src: IO error for operation on src: No such file or directory (os error 2)
```

### Context
- The failed command was read-only and did not alter project state.
- A repository-level file listing immediately revealed the correct frontend package path.
- The same package-root assumption recurred once when reading `package.json`; subsequent commands explicitly used the package path or package workdir.

### Suggested Fix
Inspect repository layout before package-scoped searches, or set `workdir` to `apps/control-plane-v3`.

### Resolution
Continued the audit from `apps/control-plane-v3`.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/package.json`
- Recurrence-Count: 2

---

## [ERR-20260714-015] backend-tests-system-python

**Logged**: 2026-07-14T12:55:13Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The first targeted backend test invocation used the system `pytest`, which lacked the API test dependency `httpx`.

### Error

```text
RuntimeError: The starlette.testclient module requires the httpx package to be installed.
```

### Context
- The repository provides dedicated virtual environments at `.venv` and `apps/api/.venv`.
- The failed command did not change application state.

### Suggested Fix
Run API tests through `apps/api/.venv/bin/pytest` from the API package directory.

### Resolution
Switched subsequent backend verification to the API virtual environment.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/pyproject.toml`

---

## [ERR-20260714-016] zsh-bracket-path-glob

**Logged**: 2026-07-14T14:48:01Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A read-only audit command passed a Next.js bracket route path to zsh without quoting it.

### Error

```text
zsh:1: no matches found: src/app/api/[...path]/route.ts
```

### Context
- zsh interpreted `[...path]` as a filename glob instead of a literal route directory.
- Other parallel audit checks completed, and no application state changed.

### Suggested Fix
Quote paths containing square brackets, for example `sed -n '1,220p' 'src/app/api/[...path]/route.ts'`.

### Resolution
Continued the audit with quoted bracket-route paths.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/src/app/api/[...path]/route.ts`

---

## [ERR-20260714-013] apply-patch-context-after-format

**Logged**: 2026-07-14T09:28:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A multi-file patch used pre-format context and failed after Prettier collapsed a call to one line.

### Error

```text
apply_patch verification failed: Failed to find expected lines in vaultgate-api.ts
```

### Context
- No files were modified by the failed patch.
- The semantic target remained unchanged, but exact surrounding lines had changed.
- The pattern recurred during the frontend polish when broad multi-file patches mixed malformed hunks or stale exact class/string context.

### Suggested Fix
Re-read only the affected snippets and split the patch into current, narrow contexts.

### Resolution
Applied the cleanup using the formatted source as patch context.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/src/lib/vaultgate-api.ts`, `apps/control-plane-v3/src/components/ui/dialog.tsx`, `apps/control-plane-v3/src/i18n/messages/zh-CN.json`
- Recurrence-Count: 5
- Last-Seen: 2026-07-14

---

## [ERR-20260714-012] npm-mirror-audit-endpoint

**Logged**: 2026-07-14T09:18:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
The configured npm mirror does not implement the npm security audit API.

### Error

```text
404 Not Found - POST https://registry.npmmirror.com/-/npm/v1/security/audits/quick
[NOT_IMPLEMENTED] /-/npm/v1/security/* not implemented yet
```

### Context
- Dependency installation works through the mirror, but vulnerability auditing cannot produce a result.
- The project and global npm configuration should not be mutated just to run one audit.

### Suggested Fix
Override the registry only for `npm audit` and use the official npm registry endpoint.

### Resolution
Re-ran `npm audit` with `--registry=https://registry.npmjs.org`.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/package-lock.json`

---

## [ERR-20260714-011] alembic-url-precedence

**Logged**: 2026-07-14T09:10:00Z
**Priority**: high
**Status**: resolved
**Area**: backend

### Summary
Alembic could not distinguish an explicit programmatic database URL from the default URL in `alembic.ini`.

### Error

```text
sqlalchemy.exc.OperationalError: table users already exists
```

### Context
- CLI migrations must honor `DATABASE_URL` from Settings.
- `migrate_db(database_url)` must instead use its explicit argument.
- Testing only whether `sqlalchemy.url` was empty failed because `alembic.ini` defines a default.

### Suggested Fix
Mark programmatic Alembic configs with an explicit attribute and implement deterministic URL precedence.

### Resolution
Added `database_url_explicit` to programmatic configs; Alembic env now preserves explicit URLs and otherwise loads Settings.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/app/db.py`, `apps/api/alembic/env.py`

---

## [ERR-20260714-010] zsh-multiline-pid-kill

**Logged**: 2026-07-14T08:50:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A zsh command substitution returned newline-separated PIDs that `kill` treated as one invalid argument.

### Error

```text
zsh:kill: illegal pid: 670486\n670754\n...
```

### Context
- Orphaned Vitest fork workers needed cleanup after test runner sessions detached.
- Quoting the multiline substitution prevented word splitting in zsh.

### Suggested Fix
Filter only matching `node` processes and pipe individual PIDs through `xargs kill`.

### Resolution
Used `ps`, `awk`, and `xargs` to terminate only this workspace's orphaned Vitest workers.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/vitest.config.ts`

---

## [ERR-20260714-009] vitest-bracket-path-filter

**Logged**: 2026-07-14T08:36:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Vitest accepted a bracketed Next.js route path filter but exited without reporting collected tests.

### Error

```text
RUN v4.1.10 ...
```

### Context
- The command filtered `src/app/agents/[agentId]/page.test.tsx` through npm.
- It exited successfully without a test file or test count, so the result was not usable as validation.

### Suggested Fix
Use a directory or filename substring filter that avoids square brackets, and require explicit test counts.

### Resolution
Re-ran the suite using stable Vitest filters and verified the reported test totals.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/src/app/agents/[agentId]/page.test.tsx`

---

## [ERR-20260714-008] production-env-example-compose-validation

**Logged**: 2026-07-14T08:28:00Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
The production env example omitted a required Compose interpolation variable.

### Error

```text
error while interpolating services.api.environment.CORS_ALLOWED_ORIGINS:
required variable CORS_ALLOWED_ORIGINS is missing a value
```

### Context
- Static operations tests passed, but `docker compose config` failed with the documented production env example.
- The example defined `APP_BASE_URL` but not the separately required `CORS_ALLOWED_ORIGINS` value.

### Suggested Fix
Validate production environment examples by executing `docker compose config`, including values with spaces and `#`.

### Resolution
Added `CORS_ALLOWED_ORIGINS` to the production example and retained real Compose expansion in release validation.

### Metadata
- Reproducible: yes
- Related Files: `ops/compose/prod.env.example`, `docker-compose.prod.yml`

---

## [ERR-20260714-013] audit-shell-status-readonly

**Logged**: 2026-07-14T07:53:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
An audit command used zsh's read-only `status` parameter as a local variable.

### Error

```text
zsh: read-only variable: status
```

### Context
- The preceding isolated `.env` source test had already completed and exposed the intended behavior.
- No repository service or persistent data was changed.

### Suggested Fix
Use a neutral shell variable such as `exit_code` in zsh orchestration commands.

### Resolution
Subsequent audit commands avoid zsh reserved parameter names.

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`

---

## [ERR-20260714-012] ci-compose-config-required-env

**Logged**: 2026-07-14T06:37:00Z
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The clean CI verification reached its final Compose check without the required encryption variable.

### Error

```text
required variable ENCRYPTION_KEY is missing a value
```

### Context
- All backend, frontend, build, and E2E checks had passed.
- Local shells could mask the issue when `ENCRYPTION_KEY` was already exported.

### Suggested Fix
Provide an explicit synthetic value only to the non-running `docker compose config` validation.

### Resolution
The verification script now supplies a clearly labeled validation-only encryption value.

### Metadata
- Reproducible: yes
- Related Files: `scripts/ops/verify-control-plane.sh`, `tests/ops/test_container_artifacts.py`

---

## [ERR-20260714-011] gh-api-query-zsh-glob

**Logged**: 2026-07-14T06:34:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
zsh expanded an unquoted GitHub API query string before `gh` could run.

### Error

```text
zsh: no matches found: repos/.../dependabot/alerts?state=open
```

### Context
- The HTTP request was never sent.
- Query-string endpoints contain glob metacharacters under zsh.

### Suggested Fix
Quote GitHub API endpoint arguments containing `?` or `&`.

### Resolution
Retried with the endpoint in single quotes.

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`

---

## [ERR-20260714-010] clean-ci-e2e-build-order

**Logged**: 2026-07-14T06:31:00Z
**Priority**: high
**Status**: resolved
**Area**: tests

### Summary
E2E passed locally only because a previous production build left `.next/standalone` behind.

### Error

```text
Next standalone server not found: .next/standalone/server.js
```

### Context
- GitHub CI ran the unified verification script from a clean checkout.
- The script invoked Playwright before `next build`, while Playwright starts the standalone server.

### Suggested Fix
Build the frontend before E2E and add an operations contract test for the ordering.

### Resolution
The unified verification script now runs `npm run build` before `npm run test:e2e`.

### Metadata
- Reproducible: yes
- Related Files: `scripts/ops/verify-control-plane.sh`, `tests/ops/test_container_artifacts.py`

---

## [ERR-20260714-009] reserved-password-postgres-smoke

**Logged**: 2026-07-14T06:12:00Z
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
The isolated PostgreSQL smoke test could not connect to the newly built API container.

### Error

```text
curl: (7) Failed to connect to 127.0.0.1 port 18080
```

### Context
- PostgreSQL used a synthetic password containing URI-reserved characters.
- The test cleanup trap removed containers before logs were captured.
- No persistent project volume or existing stack was modified.

### Suggested Fix
Reproduce while capturing API exit status and logs before cleanup, then fix the startup path.

### Resolution
Alembic uses ConfigParser interpolation. Percent-encoded URL components are now escaped when passed
to Alembic, while the resolved SQLAlchemy URL remains unchanged.

### Metadata
- Reproducible: unknown
- Related Files: `apps/api/alembic/env.py`, `apps/api/docker-entrypoint.sh`, `apps/api/app/config.py`

---

## [ERR-20260714-008] targeted-verification-lint-order

**Logged**: 2026-07-14T06:02:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
Targeted tests passed, but the combined verification command stopped at Ruff before mypy.

### Error

```text
I001 Import block is un-sorted or un-formatted
```

### Context
- All 58 targeted behavior and operations tests passed.
- New cross-module imports in two route files were not sorted.

### Suggested Fix
Run Ruff with its configured safe import fixer before resuming mypy, then rerun the complete chain.

### Resolution
Applied the repository Ruff import-order fix and resumed verification.

### Metadata
- Reproducible: yes
- Related Files: `apps/api/app/modules/admin_auth/routes.py`, `apps/api/app/modules/agents/routes.py`

---

## [ERR-20260713-003] delivery-security-verification

**Logged**: 2026-07-13T13:38:00Z
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Production Compose rendering and dependency vulnerability audits were not available in the default sandbox environment.

### Error

```text
zsh: command not found: docker
npm audit: getaddrinfo EAI_AGAIN registry.npmmirror.com
pip-audit: Failed to upgrade pip in isolated environment
```

### Context
- Commands attempted: `docker compose config`, `npm audit --audit-level=high`, and `pip-audit -r apps/api/requirements.lock --desc`.
- Docker CLI is absent from the host; dependency audits require network access and package-index metadata.

### Suggested Fix
Run Compose validation on a Docker-enabled CI runner and run dependency audits with approved network access.

### Resolution
Installed Docker Engine/Compose/Buildx, configured a reachable Docker Hub mirror, rendered both Compose models, ran real dev/production stacks, and completed pip/npm/Trivy audits successfully.

### Metadata
- Reproducible: yes
- Related Files: `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/ci.yml`

---

## [ERR-20260713-002] playwright-e2e

**Logged**: 2026-07-13T13:31:00Z
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
The E2E suite cannot launch after Playwright dependencies change unless the matching browser binary is installed again.

### Error

```text
browserType.launch: Executable doesn't exist at ~/.cache/ms-playwright/chromium_headless_shell-1217/...
Looks like Playwright was just installed or updated.
```

### Context
- Command attempted: `npm run test:e2e`.
- All 16 tests failed before page navigation; no application assertion ran.
- `bootstrap-dev-runtime.sh` installs Chromium, but `verify-control-plane.sh` assumes the browser cache remains synchronized with `node_modules`.

### Suggested Fix
Make the E2E verification path install or verify the Playwright browser revision, or document that bootstrap must be rerun after frontend dependency updates.

### Resolution
Playwright now uses an installed system Chrome when available and only downloads Chromium otherwise. This supports hosts for which Playwright publishes no browser bundle.

### Metadata
- Reproducible: yes
- Related Files: `apps/control-plane-v3/playwright.config.ts`, `scripts/ops/bootstrap-dev-runtime.sh`, `scripts/ops/verify-control-plane.sh`

---

## [ERR-20260714-001] production-security-documentation

**Logged**: 2026-07-14T00:00:00Z
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
A production security guide rewrite omitted the repository's Trivy image scanning and security-header verification contract.

### Error

```text
AssertionError: assert 'trivy' in security_guide
```

### Context
- Command attempted: `python -m pytest tests/ops/test_security_artifacts.py -q`.
- Removing a stale unused test variable exposed that the remaining documentation assertions correctly protected operational security content.

### Suggested Fix
Keep security documentation aligned with executable workflow and proxy configuration when architecture guides are rewritten.

### Resolution
Documented Trivy image gates, Caddy security headers, and credential/key rotation constraints without weakening the regression test.

### Metadata
- Reproducible: yes
- Related Files: `docs/guides/production-security.md`, `.github/workflows/security.yml`, `ops/caddy/Caddyfile`

---

## [ERR-20260714-002] verification-working-directory

**Logged**: 2026-07-14T01:00:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A combined verification command tried to run repository-level ops tests from the frontend working directory.

### Error

```text
ERROR: file or directory not found: tests/ops/test_container_artifacts.py
```

### Context
- The execution working directory was `apps/control-plane-v3` so the repository-relative test path could not resolve.
- No test or application code ran before the path error.

### Suggested Fix
Run repository-level checks from the repository root and set the frontend directory only for npm commands.

### Resolution
Separated the ops and npm audit invocations with their correct working directories.

### Metadata
- Reproducible: yes
- Related Files: `tests/ops/test_container_artifacts.py`, `apps/control-plane-v3/package.json`

---

## [ERR-20260714-003] zsh-path-loop-variable

**Logged**: 2026-07-14T01:12:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A zsh verification loop used `path` as its iteration variable, which overwrote zsh's special command-search path array.

### Error

```text
zsh: command not found: rg
zsh: command not found: git
```

### Context
- The loop completed its file-absence assertions, then later commands failed because assigning lowercase `path` also changes uppercase `PATH` in zsh.
- The command was read-only and did not alter project files.

### Suggested Fix
Avoid `path` as a zsh variable name; use `relative_file` or another ordinary identifier.

### Resolution
Re-ran the read-only delivery check with `relative_file`.

### Metadata
- Reproducible: yes
- Related Files: `.learnings/ERRORS.md`

---

## [ERR-20260714-004] docker-hub-resolution

**Logged**: 2026-07-14T01:15:00Z
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
The newly installed Docker daemon cannot pull from Docker Hub because the host resolves `registry-1.docker.io` to an unreachable address.

### Error

```text
failed to resolve reference "docker.io/library/hello-world:latest":
Head "https://registry-1.docker.io/v2/...": dial tcp 103.252.114.101:443: i/o timeout
```

### Context
- Both Docker and host `curl` time out against the resolved address, so this is not a daemon-only proxy issue.
- No HTTP proxy is configured for the user or Docker service.
- Apt and npm upstream access work, indicating a Docker Hub-specific DNS/routing problem.

### Suggested Fix
Use a reachable Docker Hub registry mirror or restore trustworthy DNS/routing, then verify image pulls and container egress.

### Resolution
Configured `https://docker.m.daocloud.io` as the daemon registry mirror in `/etc/docker/daemon.json`, restarted Docker, and verified image pulls, builds, container networking, Compose startup, and Trivy execution.

### Metadata
- Reproducible: yes
- Related Files: `/etc/docker/daemon.json`, `docs/plans/2026-07-14-docker-release-validation.md`

---

## [ERR-20260714-005] sudo-compose-environment

**Logged**: 2026-07-14T01:18:00Z
**Priority**: low
**Status**: resolved
**Area**: infra

### Summary
The host sudo policy ignores `sudo -E`, so Compose did not receive required validation variables.

### Error

```text
sudo: preserving the entire environment is not supported, '-E' is ignored
ENCRYPTION_KEY is missing a value
```

### Context
- Docker access in the current login shell still requires sudo after adding the user to the `docker` group.
- Compose interpolation happens in the privileged process, where the caller environment was stripped.

### Suggested Fix
Pass only required validation variables through `sudo env NAME=value ...`.

### Resolution
Changed validation invocations to explicit environment allowlists without weakening sudo policy.

### Metadata
- Reproducible: yes
- Related Files: `docker-compose.yml`, `docker-compose.prod.yml`

---

## [ERR-20260714-006] caddy-build-info-shell-quoting

**Logged**: 2026-07-14T02:00:00Z
**Priority**: low
**Status**: resolved
**Area**: tests

### Summary
A nested awk expression broke the shell quoting in the custom Caddy image verification command.

### Error

```text
syntax error: unexpected end of file (expecting ")")
```

### Context
- The image was not executed and no project or container state changed.
- The check only needed to verify `go1.26.5` in `caddy build-info`.

### Suggested Fix
Avoid nested quoting when a direct `grep` assertion is sufficient.

### Resolution
Replaced the awk extraction with a simple build-info output and fixed-string version check.

### Metadata
- Reproducible: yes
- Related Files: `apps/caddy/Dockerfile`

---

## [ERR-20260714-007] postgres-gosu-vulnerabilities

**Logged**: 2026-07-14T02:05:00Z
**Priority**: high
**Status**: resolved
**Area**: infra

### Summary
The current upstream `postgres:16` image contained a `gosu` helper built with Go 1.24.6 and 15 fixed High/Critical standard-library vulnerabilities.

### Error

```text
usr/local/bin/gosu: Total 15 (HIGH: 14, CRITICAL: 1)
gosu 1.19 (go1.24.6 on linux/amd64; gc)
```

### Context
- Re-pulling `postgres:16` returned the same current digest, so the issue was present in the latest upstream tag rather than a stale local image.
- The PostgreSQL Debian packages themselves had zero matching findings; all findings came from the statically linked helper.

### Suggested Fix
Preserve the official PostgreSQL runtime and entrypoint but rebuild the same gosu release with a patched Go toolchain.

### Resolution
Added `apps/postgres/Dockerfile`, rebuilt gosu 1.19 with Go 1.26.5, published/scanned it as a first-class VaultGate image, and verified fresh database initialization, Alembic migration, privilege drop, and zero fixed High/Critical Trivy findings.

### Metadata
- Reproducible: yes
- Related Files: `apps/postgres/Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `.github/workflows/docker-images.yml`, `.github/workflows/security.yml`

---

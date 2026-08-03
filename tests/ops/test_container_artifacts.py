from __future__ import annotations

import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_api_dev_dependencies_include_test_client_transport() -> None:
    pyproject = tomllib.loads((ROOT / "apps/api/pyproject.toml").read_text())

    assert "httpx>=0.28.1" in pyproject["project"]["optional-dependencies"]["dev"]


def test_container_artifacts_exist() -> None:
    assert (ROOT / ".github/workflows/docker-images.yml").exists()
    assert (ROOT / ".github/workflows/deploy.yml").exists()
    assert (ROOT / "apps/api/Dockerfile").exists()
    assert (ROOT / "apps/caddy/Dockerfile").exists()
    assert (ROOT / "apps/postgres/Dockerfile").exists()
    assert (ROOT / "apps/api/docker-entrypoint.sh").exists()
    assert (ROOT / "apps/control-plane-v3/Dockerfile").exists()
    assert (ROOT / "docker-compose.prod.yml").exists()
    assert (ROOT / "ops/caddy/Caddyfile").exists()
    assert (ROOT / "ops/compose/prod.env.example").exists()
    assert (ROOT / "docs/guides/production-deployment.md").exists()
    assert (ROOT / "docs/guides/production-operations.md").exists()


def test_compose_includes_web_and_api_services() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    assert "\n  web:\n" in compose or "\nweb:\n" in compose
    assert "\n  api:\n" in compose or "\napi:\n" in compose


def test_api_dockerfile_exposes_runtime_contract() -> None:
    dockerfile = (ROOT / "apps/api/Dockerfile").read_text()
    entrypoint = (ROOT / "apps/api/docker-entrypoint.sh").read_text()
    assert "FROM python:3.12-slim@sha256:" in dockerfile
    assert "requirements.lock" in dockerfile
    assert "pip install" in dockerfile
    assert "-r requirements.lock" in dockerfile
    assert "PYTHONPATH=/srv/vaultgate/apps/api" in dockerfile
    assert "pip install --no-cache-dir --no-deps ./apps/api" not in dockerfile
    assert "COPY apps/api/docker-entrypoint.sh" in dockerfile
    assert "ENTRYPOINT" in dockerfile
    assert "EXPOSE 8000" in dockerfile
    assert "uvicorn" in dockerfile
    assert "alembic" in entrypoint.lower()
    assert "migrate_db" in entrypoint
    assert "migration lock" in entrypoint.lower()
    assert '[ -n "${DATABASE_URL:-}" ]' not in entrypoint
    alembic_env = (ROOT / "apps/api/alembic/env.py").read_text()
    assert "Settings().database_url" in alembic_env
    assert '.replace("%", "%%")' in alembic_env
    assert 'exec "$@"' in entrypoint


def test_api_runtime_lockfile_exists() -> None:
    lockfile = ROOT / "apps/api/requirements.lock"
    assert lockfile.exists()
    contents = lockfile.read_text()
    assert "fastapi==" in contents
    assert "sqlalchemy==" in contents.lower()
    assert "uvicorn==" in contents


def test_web_dockerfile_builds_next_app() -> None:
    dockerfile = (ROOT / "apps/control-plane-v3/Dockerfile").read_text()
    assert "FROM node:22-bookworm-slim@sha256:" in dockerfile
    assert " AS deps" in dockerfile
    assert "npm ci" in dockerfile
    assert "npm run build" in dockerfile
    assert ".next/standalone" in dockerfile
    assert ".next/static" in dockerfile
    assert "RUN rm -rf" in dockerfile
    assert "/usr/local/lib/node_modules/npm" in dockerfile
    assert "/usr/local/bin/corepack" in dockerfile
    assert "EXPOSE 3000" in dockerfile
    assert 'CMD ["node", "server.js"]' in dockerfile


def test_compose_defines_complete_stack() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    for service in ("postgres", "api", "web"):
        assert f"\n  {service}:\n" in compose or compose.startswith(f"{service}:\n")

    assert "depends_on:\n      api:" in compose
    assert "postgres-data:" in compose


def test_dev_compose_builds_local_app_services_without_pulling_fake_local_tags() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    assert "dockerfile: apps/api/Dockerfile" in compose
    assert "dockerfile: apps/postgres/Dockerfile" in compose
    assert "dockerfile: apps/control-plane-v3/Dockerfile" in compose
    assert "vaultgate-api:local" not in compose
    assert "vaultgate-web:local" not in compose


def test_dev_compose_binds_exposed_services_to_loopback_only() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()

    assert "APP_ENV: ${APP_ENV:-development}" in compose
    assert "127.0.0.1:${POSTGRES_PORT:-5432}:5432" in compose
    assert "127.0.0.1:${API_PORT:-8000}:8000" in compose
    assert "127.0.0.1:${WEB_PORT:-3000}:3000" in compose


def test_docker_workflow_builds_all_images_with_ghcr() -> None:
    workflow = (ROOT / ".github/workflows/docker-images.yml").read_text()
    assert "docker/login-action" in workflow
    assert "ghcr.io/" in workflow
    assert "apps/api/Dockerfile" in workflow
    assert "apps/caddy/Dockerfile" in workflow
    assert "apps/postgres/Dockerfile" in workflow
    assert "apps/control-plane-v3/Dockerfile" in workflow
    assert "Push scanned image" in workflow
    assert "if: github.event_name != 'pull_request'" in workflow
    assert "docker/metadata-action" in workflow


def test_deploy_workflow_syncs_and_restarts_remote_stack() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()
    entrypoint = (ROOT / "apps/api/docker-entrypoint.sh").read_text()
    assert "workflow_dispatch" in workflow
    assert "workflow_run" not in workflow
    assert 'workflows: ["Docker Images"]' not in workflow
    assert "appleboy/scp-action" in workflow
    assert "appleboy/ssh-action" in workflow
    compose = "docker compose --env-file .env.production --env-file .release.env -f docker-compose.prod.yml"
    assert f"{compose} config" in workflow
    assert f"{compose} pull" in workflow
    resolved_compose = "docker compose --env-file .env.production --env-file .resolved-release.env -f docker-compose.prod.yml"
    assert f"{resolved_compose} up -d --remove-orphans" in workflow
    assert ".env.production" in workflow
    assert "DEPLOY_ENV_FILE" in workflow
    assert "smoke-test.sh" in workflow
    assert "> .env.production" in workflow
    assert "if [ ! -f .env.production ]" not in workflow
    assert "alembic" in entrypoint.lower()
    assert "migrate_db" in entrypoint


def test_prod_compose_uses_published_images() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "${CADDY_IMAGE:" in compose
    assert "${POSTGRES_IMAGE:" in compose
    assert "${API_IMAGE:" in compose
    assert "${WEB_IMAGE:" in compose
    assert "\n  caddy:\n" in compose
    assert "restart: unless-stopped" in compose
    assert "SESSION_SECURE: \"true\"" in compose
    assert "DATABASE_URL: ${DATABASE_URL:-}" in compose
    assert "POSTGRES_HOST: postgres" in compose
    assert "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-}" in compose
    assert "POSTGRES_PASSWORD_FILE: ${POSTGRES_PASSWORD_FILE:-}" in compose
    assert "postgresql://${POSTGRES_USER" not in compose


def test_production_env_template_includes_runtime_placeholders() -> None:
    env_example = (ROOT / "ops/compose/prod.env.example").read_text()
    assert "DATABASE_URL=" in env_example
    assert "leave DATABASE_URL unset" in env_example
    assert "ENCRYPTION_KEY=" in env_example
    assert "BOOTSTRAP_TOKEN=" in env_example
    assert "SESSION_SECRET=" not in env_example
    assert "NEXT_PUBLIC_API_BASE_URL=" not in env_example
    assert "API_IMAGE=" not in env_example
    assert "CADDY_IMAGE=" not in env_example
    assert "POSTGRES_IMAGE=" not in env_example
    assert "WEB_IMAGE=" not in env_example
    assert "APP_ENV=" not in env_example
    assert "SESSION_SECURE=" not in env_example
    assert "HSTS_MAX_AGE=" not in env_example
    assert "CSP_REPORT_ONLY=" not in env_example
    assert "APP_BASE_URL=" in env_example


def test_production_env_template_matches_single_source_database_guidance() -> None:
    env_example = (ROOT / "ops/compose/prod.env.example").read_text()
    assert "DATABASE_URL=" in env_example
    assert "leave DATABASE_URL unset" in env_example
    assert "POSTGRES_PASSWORD=replace-with-strong-password" in env_example


def test_readme_documents_compose_and_image_pipeline() -> None:
    readme = (ROOT / "README.md").read_text()
    assert "docker compose up -d" in readme
    assert "docker-compose.prod.yml" in readme
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml" in readme


def test_web_does_not_import_runtime_google_fonts() -> None:
    globals_css = (ROOT / "apps/control-plane-v3/src/app/globals.css").read_text()

    assert "fonts.googleapis.com" not in globals_css


def test_prod_compose_includes_caddy_and_excludes_openbao() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "caddy:" in compose
    assert "openbao:" not in compose


def test_smoke_script_checks_https_entrypoint() -> None:
    script = (ROOT / "scripts/ops/smoke-test.sh").read_text()
    assert "APP_BASE_URL" in script
    assert "--location" in script
    assert "--resolve" in script
    assert "x-request-id" in script.lower()
    assert "/healthz" in script
    assert "/readyz" in script
    assert "/api/admin/bootstrap/status" in script
    assert "/api/admin/session" in script
    assert "401" in script


def test_dev_runtime_bootstrap_script_is_present() -> None:
    script_path = ROOT / "scripts/ops/bootstrap-dev-runtime.sh"
    assert script_path.exists()


def test_dev_runtime_bootstrap_uses_the_development_lock() -> None:
    script = (ROOT / "scripts/ops/bootstrap-dev-runtime.sh").read_text()
    assert "requirements-dev.lock" in script
    assert 'REQUIRED_PYTHON_MINOR="3.12"' in script
    assert "--require-hashes" in script
    assert "install --no-deps -e" in script
    assert 'bin/pip" check' in script


def test_development_lock_is_a_complete_hashed_graph() -> None:
    lockfile = (ROOT / "apps/api/requirements-dev.lock").read_text()
    assert "pip-compile --extra=dev --generate-hashes" in lockfile
    assert "pytest==" in lockfile
    assert "fastapi==" in lockfile
    assert "--hash=sha256:" in lockfile
    assert "-r requirements.lock" not in lockfile


def test_repo_verification_script_is_present() -> None:
    script_path = ROOT / "scripts/ops/verify-control-plane.sh"
    assert script_path.exists()


def test_repo_verification_uses_the_non_blocking_pytest_entrypoint() -> None:
    script = (ROOT / "scripts/ops/verify-control-plane.sh").read_text()
    runner = (ROOT / "scripts/ops/run-pytest.py").read_text()

    assert "scripts/ops/run-pytest.py" in script
    assert 'VERIFY_PYTHON="${VERIFY_PYTHON:-' in script
    assert "pytest.main(sys.argv[1:])" in runner


def test_repo_verification_runs_browser_flows() -> None:
    script = (ROOT / "scripts/ops/verify-control-plane.sh").read_text()

    assert "npm run test:e2e" in script
    assert "npm run test:performance" in script
    assert script.index("npm run build") < script.index("npm run test:e2e")
    assert 'ENCRYPTION_KEY="verification-only-not-a-production-key" docker compose config' in script
    assert "RUN_SYNTHETIC_FLOW" in script


def test_browser_matrix_and_accessibility_gate_are_configured() -> None:
    config = (ROOT / "apps/control-plane-v3/playwright.config.ts").read_text()
    package = (ROOT / "apps/control-plane-v3/package.json").read_text()
    workflow = (ROOT / ".github/workflows/ci.yml").read_text()

    assert "mobile-chrome" in config
    assert "Desktop Safari" in config
    assert "test:a11y" in package
    assert "@axe-core/playwright" in package
    assert "playwright install --with-deps chromium webkit" in workflow


def test_synthetic_flow_enforces_a_small_load_budget() -> None:
    script = (ROOT / "scripts/ops/run-synthetic-flow.sh").read_text()
    load_smoke = (ROOT / "scripts/ops/load-smoke.mjs").read_text()
    spec = (
        ROOT / "apps/control-plane-v3/test/integration/vaultgate.synthetic.spec.ts"
    ).read_text()

    assert "load-smoke.mjs" in script
    assert "LOAD_CONCURRENCY" in load_smoke
    assert "LOAD_DURATION_SECONDS" in load_smoke
    assert "LOAD_P95_BUDGET_MS" in load_smoke
    assert "/api/admin/bootstrap/status" in load_smoke
    assert "synthetic-load-" in spec
    assert "writeP95" in spec


def test_synthetic_flow_uses_a_fresh_compose_stack() -> None:
    script = (ROOT / "scripts/ops/run-synthetic-flow.sh").read_text()
    spec = (ROOT / "apps/control-plane-v3/test/integration/vaultgate.synthetic.spec.ts").read_text()
    assert "docker compose" in script
    assert "down -v" in script
    assert 'POSTGRES_PORT="${POSTGRES_PORT:-55432}"' in script
    assert 'API_PORT="${API_PORT:-58000}"' in script
    assert 'WEB_PORT="${WEB_PORT:-53100}"' in script
    assert "npm run test:integration" in script
    assert "/api/vault/secrets" in spec
    assert "/api/admin/audit-logs" in spec


def test_operations_docs_reference_request_ids_for_incident_tracing() -> None:
    operations_guide = (ROOT / "docs/guides/production-operations.md").read_text()
    security_guide = (ROOT / "docs/guides/production-security.md").read_text()

    assert "x-request-id" in operations_guide.lower()
    assert "x-request-id" in security_guide.lower()


def test_security_docs_explain_fail_fast_production_secrets_and_secure_cookies() -> None:
    security_guide = (ROOT / "docs/guides/production-security.md").read_text().lower()

    assert "encryption_key" in security_guide
    assert "server-side" in security_guide
    assert "session_secure" in security_guide


def test_ci_and_deployment_docs_reference_migration_step() -> None:
    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    deployment_guide = (ROOT / "docs/guides/production-deployment.md").read_text().lower()
    entrypoint = (ROOT / "apps/api/docker-entrypoint.sh").read_text().lower()

    assert "alembic upgrade head" in ci_workflow
    assert "alembic upgrade head" in deployment_guide
    assert "startup" in deployment_guide
    assert "alembic" in entrypoint
    assert "migrate_db" in entrypoint


def test_repo_quality_floor_is_documented_and_enforced() -> None:
    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    web_package = (ROOT / "apps/control-plane-v3/package.json").read_text()

    assert (ROOT / ".editorconfig").exists()
    assert (ROOT / "apps/control-plane-v3/eslint.config.mjs").exists()
    assert '"typecheck"' in web_package
    assert '"lint"' in web_package
    assert '"test:unit"' in web_package
    assert "./scripts/ops/verify-control-plane.sh" in ci_workflow


def test_ci_uses_unified_verification_for_tests_and_static_checks() -> None:
    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()

    assert "Lint Python (ruff)" not in ci_workflow
    assert "Type check Python (mypy)" not in ci_workflow
    assert "Run API tests (pytest)" not in ci_workflow
    assert ci_workflow.count("./scripts/ops/verify-control-plane.sh") == 1


def test_ci_audits_locked_api_runtime_dependencies() -> None:
    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()

    assert "pip-audit -r requirements.lock" in ci_workflow
    assert "npm run audit:dependencies" in ci_workflow
    audit_script = (ROOT / "apps/control-plane-v3/scripts/audit-dependencies.mjs").read_text()
    assert "--omit=dev" in audit_script
    assert "GHSA-mh99-v99m-4gvg" in audit_script


def test_frontend_dead_design_token_layer_is_removed() -> None:
    assert not (ROOT / "apps/control-plane-v3/src/lib/design-tokens.ts").exists()

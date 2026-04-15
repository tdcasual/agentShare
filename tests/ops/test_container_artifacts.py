from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_container_artifacts_exist() -> None:
    assert (ROOT / ".github/workflows/docker-images.yml").exists()
    assert (ROOT / ".github/workflows/deploy.yml").exists()
    assert (ROOT / "apps/api/Dockerfile").exists()
    assert (ROOT / "apps/api/docker-entrypoint.sh").exists()
    assert (ROOT / "apps/control-plane-v3/Dockerfile").exists()
    assert (ROOT / "docker-compose.coolify.yml").exists()
    assert (ROOT / "docker-compose.prod.yml").exists()
    assert (ROOT / "ops/caddy/Caddyfile").exists()
    assert (ROOT / "ops/openbao/openbao.hcl").exists()
    assert (ROOT / "ops/openbao/start-openbao.sh").exists()
    assert (ROOT / "ops/compose/coolify.env.example").exists()
    assert (ROOT / "ops/compose/prod.env.example").exists()
    assert (ROOT / "docs/guides/coolify-deployment.md").exists()
    assert (ROOT / "docs/guides/coolify-project-deployment-for-agents.md").exists()
    assert (ROOT / "docs/guides/production-deployment.md").exists()
    assert (ROOT / "docs/guides/production-operations.md").exists()


def test_compose_includes_web_and_api_services() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    assert "\n  web:\n" in compose or "\nweb:\n" in compose
    assert "\n  api:\n" in compose or "\napi:\n" in compose


def test_api_dockerfile_exposes_runtime_contract() -> None:
    dockerfile = (ROOT / "apps/api/Dockerfile").read_text()
    entrypoint = (ROOT / "apps/api/docker-entrypoint.sh").read_text()
    assert "FROM python:3.12-slim" in dockerfile
    assert "requirements.lock" in dockerfile
    assert "pip install --no-cache-dir -r apps/api/requirements.lock" in dockerfile
    assert "pip install --no-cache-dir --no-deps ./apps/api" in dockerfile
    assert "COPY apps/api/docker-entrypoint.sh" in dockerfile
    assert "ENTRYPOINT" in dockerfile
    assert 'EXPOSE 8000' in dockerfile
    assert 'uvicorn' in dockerfile
    assert "alembic upgrade head" in entrypoint
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
    assert "FROM node:22-bookworm-slim AS deps" in dockerfile
    assert "npm ci" in dockerfile
    assert "npm run build" in dockerfile
    assert ".next/standalone" in dockerfile
    assert ".next/static" in dockerfile
    assert "EXPOSE 3000" in dockerfile
    assert 'CMD ["node", "server.js"]' in dockerfile


def test_compose_defines_complete_stack() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    for service in ("openbao", "postgres", "redis", "api", "web"):
      assert f"\n  {service}:\n" in compose or compose.startswith(f"{service}:\n")

    assert "depends_on:\n      api:" in compose
    assert "depends_on:\n      openbao:" in compose
    assert "postgres-data:" in compose
    assert "redis-data:" in compose
    assert "AGENT_CONTROL_PLANE_API_URL" in compose


def test_dev_compose_builds_local_app_services_without_pulling_fake_local_tags() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    assert "dockerfile: apps/api/Dockerfile" in compose
    assert "dockerfile: apps/control-plane-v3/Dockerfile" in compose
    assert "agentshare-api:local" not in compose
    assert "agentshare-web:local" not in compose


def test_dev_compose_openbao_healthcheck_uses_ipv4_loopback() -> None:
    compose = (ROOT / "docker-compose.yml").read_text()
    assert '["CMD", "wget", "--spider", "-q", "http://127.0.0.1:8200/v1/sys/health"]' in compose
    assert "http://localhost:8200/v1/sys/health" not in compose


def test_docker_workflow_builds_both_images_with_ghcr() -> None:
    workflow = (ROOT / ".github/workflows/docker-images.yml").read_text()
    assert "docker/login-action" in workflow
    assert "ghcr.io/" in workflow
    assert "apps/api/Dockerfile" in workflow
    assert "apps/control-plane-v3/Dockerfile" in workflow
    assert "push: ${{ github.event_name != 'pull_request' }}" in workflow
    assert "docker/metadata-action" in workflow


def test_deploy_workflow_syncs_and_restarts_remote_stack() -> None:
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text()
    entrypoint = (ROOT / "apps/api/docker-entrypoint.sh").read_text()
    assert "workflow_dispatch" in workflow
    assert "workflow_run" not in workflow
    assert 'workflows: ["Docker Images"]' not in workflow
    assert "appleboy/scp-action" in workflow
    assert "appleboy/ssh-action" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml config" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml pull" in workflow
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml up -d --remove-orphans" in workflow
    assert ".env.production" in workflow
    assert "DEPLOY_ENV_FILE" in workflow
    assert "smoke-test.sh" in workflow
    assert "cat > .env.production" in workflow
    assert "if [ ! -f .env.production ]" not in workflow
    assert "alembic upgrade head" in entrypoint


def test_prod_compose_uses_published_images() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()
    assert "${API_IMAGE:" in compose
    assert "${WEB_IMAGE:" in compose
    assert "\n  caddy:\n" in compose
    assert "restart: unless-stopped" in compose
    assert "MANAGEMENT_SESSION_SECURE: ${MANAGEMENT_SESSION_SECURE:-true}" in compose


def test_coolify_compose_uses_local_builds_and_same_stack_openbao() -> None:
    compose = (ROOT / "docker-compose.coolify.yml").read_text()
    assert "\n  openbao:\n" in compose
    assert "\n  postgres:\n" in compose
    assert "\n  redis:\n" in compose
    assert "\n  api:\n" in compose
    assert "\n  web:\n" in compose
    assert "ops/openbao/openbao.hcl" in compose
    assert "ops/openbao/start-openbao.sh" in compose
    assert "openbao-data:" in compose
    assert "dockerfile: apps/api/Dockerfile" in compose
    assert "dockerfile: apps/control-plane-v3/Dockerfile" in compose
    assert "APP_ENV: ${APP_ENV:-production}" in compose
    assert "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}" in compose
    assert "DATABASE_URL: ${DATABASE_URL:-postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-agent_share}}" in compose
    assert "OPENBAO_ADDR: ${OPENBAO_ADDR:-http://openbao:8200}" in compose
    assert "OPENBAO_TOKEN_FILE: ${OPENBAO_TOKEN_FILE:-/openbao/bootstrap/root-token}" in compose
    assert "BOOTSTRAP_OWNER_KEY: ${BOOTSTRAP_OWNER_KEY:?BOOTSTRAP_OWNER_KEY is required}" in compose
    assert "MANAGEMENT_SESSION_SECRET: ${MANAGEMENT_SESSION_SECRET:?MANAGEMENT_SESSION_SECRET is required}" in compose
    assert "MANAGEMENT_SESSION_SECURE: ${MANAGEMENT_SESSION_SECURE:-true}" in compose
    assert "NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL:-https://${PUBLIC_HOST:-localhost}}" in compose
    assert "OPENAI_API_KEY: ${OPENAI_API_KEY:-}" in compose
    assert "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}" in compose
    assert "DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY:-}" in compose
    assert "depends_on:\n      openbao:" in compose
    assert "caddy:" not in compose


def test_coolify_env_template_documents_single_stack_defaults() -> None:
    env_example = (ROOT / "ops/compose/coolify.env.example").read_text()
    assert "APP_ENV=production" in env_example
    assert "PUBLIC_HOST=agentshare.example.com" in env_example
    assert "leave DATABASE_URL unset" in env_example
    assert "REDIS_URL=redis://redis:6379/0" in env_example
    assert "OPENBAO_ADDR=http://openbao:8200" in env_example
    assert "OPENBAO_TOKEN_FILE=/openbao/bootstrap/root-token" in env_example
    assert "NEXT_PUBLIC_API_BASE_URL=https://agentshare.example.com" in env_example
    assert "AGENT_CONTROL_PLANE_API_URL=http://api:8000" in env_example
    assert "OPENAI_API_KEY=" in env_example


def test_production_env_template_includes_runtime_placeholders() -> None:
    env_example = (ROOT / "ops/compose/prod.env.example").read_text()
    assert "DATABASE_URL=" in env_example
    assert "BOOTSTRAP_OWNER_KEY=" in env_example
    assert "MANAGEMENT_SESSION_SECRET=" in env_example
    assert "NEXT_PUBLIC_API_BASE_URL=" in env_example
    assert "API_IMAGE=" in env_example
    assert "WEB_IMAGE=" in env_example
    assert "SECRET_BACKEND_URL=" in env_example
    assert "SECRET_BACKEND_TOKEN=" in env_example
    assert "APP_BASE_URL=" in env_example


def test_readme_documents_compose_and_image_pipeline() -> None:
    readme = (ROOT / "README.md").read_text()
    assert "docker compose up -d" in readme
    assert "docker-compose.coolify.yml" in readme
    assert "coolify-project-deployment-for-agents.md" in readme
    assert "Coolify" in readme
    assert "GitHub Actions" in readme
    assert "ghcr.io" in readme
    assert "API_IMAGE" in readme
    assert "DEPLOY_HOST" in readme
    assert "DEPLOY_ENV_FILE" in readme
    assert "docker compose --env-file .env.production -f docker-compose.prod.yml pull" in readme
    assert "workflow_dispatch" in readme
    assert "manual only" in readme.lower()
    assert "rollback" in readme.lower()
    assert "external secret backend" in readme.lower()
    assert "backup" in readme.lower()
    assert "restore" in readme.lower()
    assert "caddy" in readme.lower()
    assert "smoke" in readme.lower()


def test_web_uses_self_hosted_next_fonts_instead_of_runtime_google_css_import() -> None:
    layout = (ROOT / "apps/control-plane-v3/src/app/layout.tsx").read_text()
    globals_css = (ROOT / "apps/control-plane-v3/src/app/globals.css").read_text()

    assert "next/font/google" in layout
    assert "Nunito" in layout
    assert "Quicksand" in layout
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
    assert "/metrics" in script
    assert "agent_control_plane_http_requests_total" in script


def test_dev_runtime_bootstrap_script_is_present_and_documented() -> None:
    script_path = ROOT / "scripts/ops/bootstrap-dev-runtime.sh"
    readme = (ROOT / "README.md").read_text().lower()

    assert script_path.exists()
    assert "bootstrap-dev-runtime.sh" in readme
    assert ".venv" in readme


def test_repo_verification_script_is_present_and_documented() -> None:
    script_path = ROOT / "scripts/ops/verify-control-plane.sh"
    readme = (ROOT / "README.md").read_text().lower()

    assert script_path.exists()
    assert "verify-control-plane.sh" in readme


def test_operations_docs_reference_request_ids_for_incident_tracing() -> None:
    operations_guide = (ROOT / "docs/guides/production-operations.md").read_text()
    security_guide = (ROOT / "docs/guides/production-security.md").read_text()

    assert "x-request-id" in operations_guide.lower()
    assert "x-request-id" in security_guide.lower()


def test_security_docs_explain_fail_fast_production_secrets_and_secure_cookies() -> None:
    security_guide = (ROOT / "docs/guides/production-security.md").read_text().lower()

    assert "changeme-bootstrap-key" in security_guide
    assert "changeme-management-session-secret" in security_guide
    assert "management_session_secure" in security_guide


def test_ci_and_deployment_docs_reference_migration_step() -> None:
    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    deployment_guide = (ROOT / "docs/guides/production-deployment.md").read_text().lower()
    entrypoint = (ROOT / "apps/api/docker-entrypoint.sh").read_text().lower()

    assert "alembic upgrade head" in ci_workflow
    assert "alembic upgrade head" in deployment_guide
    assert "startup" in deployment_guide
    assert "docker-entrypoint.sh" in deployment_guide
    assert "alembic upgrade head" in entrypoint


def test_repo_quality_floor_is_documented_and_enforced() -> None:
    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    web_package = (ROOT / "apps/control-plane-v3/package.json").read_text()
    readme = (ROOT / "README.md").read_text().lower()

    assert (ROOT / ".editorconfig").exists()
    assert (ROOT / "apps/control-plane-v3/eslint.config.mjs").exists()
    assert '"typecheck"' in web_package
    assert '"lint"' in web_package
    assert '"test:contracts"' in web_package
    assert '"test:unit"' in web_package
    assert "./scripts/ops/verify-control-plane.sh" in ci_workflow
    assert "quality floor" in readme
    assert "clean repo state" in readme


def test_frontend_dead_design_token_layer_is_removed() -> None:
    assert not (ROOT / "apps/control-plane-v3/src/lib/design-tokens.ts").exists()

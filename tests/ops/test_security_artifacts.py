from __future__ import annotations

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]


def test_third_party_actions_are_pinned_to_commits() -> None:
    action_reference = re.compile(r"uses:\s+[^\s]+@([^\s#]+)")
    for workflow in (ROOT / ".github/workflows").glob("*.yml"):
        for reference in action_reference.findall(workflow.read_text()):
            assert re.fullmatch(r"[0-9a-f]{40}", reference), (
                f"{workflow.name} contains mutable Action reference @{reference}"
            )


def test_security_workflow_scans_container_artifacts() -> None:
    workflow = (ROOT / ".github/workflows/security.yml").read_text()

    assert "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25" in workflow
    assert "workflow_dispatch" in workflow
    assert "schedule:" in workflow
    assert "ghcr.io/" in workflow or "image-ref" in workflow
    assert "vaultgate-caddy" in workflow
    assert "vaultgate-postgres" in workflow
    assert "push:" not in workflow


def test_image_workflow_scans_the_built_commit_before_pushing() -> None:
    workflow = (ROOT / ".github/workflows/docker-images.yml").read_text()

    build_position = workflow.index("Build image for scanning")
    scan_position = workflow.index("Scan exact image")
    push_position = workflow.index("Push scanned image")
    assert build_position < scan_position < push_position
    assert "load: true" in workflow
    assert "scan-${{ github.sha }}" in workflow
    assert "aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25" in workflow
    assert "push: ${{ github.event_name != 'pull_request' }}" not in workflow


def test_python_coverage_tracks_starlette_testclient_threads() -> None:
    pyproject = (ROOT / "apps/api/pyproject.toml").read_text()

    assert '[tool.coverage.run]' in pyproject
    assert 'concurrency = ["thread"]' in pyproject


def test_caddyfile_sets_security_headers() -> None:
    caddyfile = (ROOT / "ops/caddy/Caddyfile").read_text()

    assert "header" in caddyfile
    assert "Strict-Transport-Security" in caddyfile
    assert "X-Content-Type-Options" in caddyfile
    assert "X-Frame-Options" in caddyfile
    assert "Referrer-Policy" in caddyfile
    assert "Content-Security-Policy" not in caddyfile


def test_next_proxy_owns_nonce_content_security_policy() -> None:
    proxy = (ROOT / "apps/control-plane-v3/src/proxy.ts").read_text()
    next_config = (ROOT / "apps/control-plane-v3/next.config.mjs").read_text()

    assert "Content-Security-Policy" in proxy
    assert "'nonce-${nonce}'" in proxy
    assert "script-src" in proxy
    assert "script-src 'self' 'unsafe-inline'" not in proxy
    assert "Content-Security-Policy" not in next_config


def test_caddy_routes_frontend_docs_without_shadowing_them() -> None:
    caddyfile = (ROOT / "ops/caddy/Caddyfile").read_text()

    assert "handle /api/*" in caddyfile
    assert "handle /docs*" not in caddyfile
    assert "handle /openapi.json" not in caddyfile


def test_production_api_only_trusts_the_fixed_caddy_address() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()

    assert "ipv4_address: 172.30.0.2" in compose
    assert "ip_range: 172.30.0.128/25" in compose
    assert "TRUSTED_PROXY_CIDRS: ${TRUSTED_PROXY_CIDRS:-172.30.0.2/32}" in compose


def test_production_docs_cover_security_scans_and_headers() -> None:
    security_guide = (ROOT / "docs/guides/production-security.md").read_text().lower()

    assert "trivy" in security_guide
    assert "security headers" in security_guide
    assert "secret rotation" in security_guide

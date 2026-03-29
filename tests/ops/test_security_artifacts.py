from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_security_workflow_scans_container_artifacts() -> None:
    workflow = (ROOT / ".github/workflows/security.yml").read_text()

    assert "trivy-action" in workflow
    assert "workflow_dispatch" in workflow
    assert "schedule:" in workflow
    assert "ghcr.io/" in workflow or "image-ref" in workflow


def test_caddyfile_sets_security_headers() -> None:
    caddyfile = (ROOT / "ops/caddy/Caddyfile").read_text()

    assert "header" in caddyfile
    assert "Strict-Transport-Security" in caddyfile
    assert "X-Content-Type-Options" in caddyfile
    assert "X-Frame-Options" in caddyfile
    assert "Referrer-Policy" in caddyfile


def test_production_docs_cover_security_scans_and_headers() -> None:
    readme = (ROOT / "README.md").read_text().lower()
    deployment_guide = (ROOT / "docs/guides/production-deployment.md").read_text().lower()
    security_guide = (ROOT / "docs/guides/production-security.md").read_text().lower()

    assert "trivy" in security_guide
    assert "security headers" in security_guide
    assert "secret rotation" in security_guide
    assert "metrics" in security_guide
    assert "security scan" in readme
    assert "headers" in deployment_guide

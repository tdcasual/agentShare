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


def test_production_docs_cover_security_scans_and_headers() -> None:
    security_guide = (ROOT / "docs/guides/production-security.md").read_text().lower()

    assert "trivy" in security_guide
    assert "security headers" in security_guide
    assert "secret rotation" in security_guide

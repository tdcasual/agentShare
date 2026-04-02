from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_platform_handoff_checklist_covers_required_platform_migrations() -> None:
    checklist = (ROOT / "docs/guides/platform-handoff-checklist.md").read_text().lower()

    assert "managed postgres" in checklist
    assert "managed redis" in checklist
    assert "external secret backend" in checklist
    assert "sso" in checklist
    assert "ha failover" in checklist or "high-availability failover" in checklist
    assert "centralized alerting" in checklist
    assert "incident escalation" in checklist
    assert "trial-run ready" in checklist
    assert "enterprise-ready" in checklist


def test_platform_ownership_matrix_covers_boundary_owners() -> None:
    matrix = (ROOT / "docs/guides/platform-ownership-matrix.md").read_text().lower()

    assert "repository-owned" in matrix
    assert "platform-owned" in matrix
    assert "postgres" in matrix
    assert "redis" in matrix
    assert "secret backend" in matrix
    assert "operator identity" in matrix or "sso" in matrix
    assert "alerting" in matrix
    assert "failover" in matrix


def test_ops_docs_link_back_to_platform_handoff_package() -> None:
    operations = (ROOT / "docs/guides/production-operations.md").read_text().lower()
    security = (ROOT / "docs/guides/production-security.md").read_text().lower()
    readme = (ROOT / "README.md").read_text().lower()

    assert "platform-handoff-checklist" in operations
    assert "platform-ownership-matrix" in operations
    assert "platform-handoff-checklist" in security
    assert "platform-ownership-matrix" in security
    assert "platform-handoff-checklist" in readme
    assert "platform-ownership-matrix" in readme

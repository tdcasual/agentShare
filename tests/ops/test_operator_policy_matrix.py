from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_operator_policy_matrix_exists_and_names_core_actions() -> None:
    guide = (ROOT / "docs/guides/operator-policy-matrix.md").read_text().lower()

    assert "admin_accounts:create" in guide
    assert "admin_accounts:disable" in guide
    assert "agents:create" in guide
    assert "tokens:issue" in guide
    assert "reviews:decide" in guide
    assert "tasks:create" in guide
    assert "viewer" in guide
    assert "operator" in guide
    assert "admin" in guide
    assert "owner" in guide

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_smoke_script_checks_trial_run_entrypoints_and_metrics() -> None:
    script = (ROOT / "scripts/ops/smoke-test.sh").read_text()

    assert "/healthz" in script
    assert "/metrics" in script
    assert '"${APP_BASE_URL}/"' in script
    assert "x-request-id" in script.lower()
    assert "agent_control_plane_management_session_logins_total" in script
    assert "agent_control_plane_management_session_logouts_total" in script
    assert "agent_control_plane_approval_approvals_total" in script


def test_operations_guide_contains_trial_run_checklist() -> None:
    operations_guide = (ROOT / "docs/guides/production-operations.md").read_text().lower()

    assert "startup verification" in operations_guide
    assert "backup cadence" in operations_guide
    assert "restore drill" in operations_guide
    assert "trial-run checklist" in operations_guide
    assert "governance workflow" in operations_guide


def test_security_guide_mentions_rotation_rehearsal_for_trial_runs() -> None:
    security_guide = (ROOT / "docs/guides/production-security.md").read_text().lower()

    assert "rotation rehearsal" in security_guide
    assert "operator session" in security_guide

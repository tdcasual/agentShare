from __future__ import annotations

import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_demo_stack_script_exists_and_is_executable() -> None:
    script = ROOT / "scripts/ops/start-control-plane-demo.sh"
    assert script.exists()
    assert os.access(script, os.X_OK)


def test_demo_stack_script_prints_demo_runtime_contract() -> None:
    script = ROOT / "scripts/ops/start-control-plane-demo.sh"

    result = subprocess.run(
        [str(script), "--print-config"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

    assert "apps/api" in result.stdout
    assert "apps/control-plane-v3" in result.stdout
    assert "DEMO_SEED_ENABLED=true" in result.stdout
    assert "BACKEND_API_URL=http://127.0.0.1:8000" in result.stdout
    assert "owner@example.com" in result.stdout


def test_demo_stack_script_passes_shellcheck() -> None:
    script = ROOT / "scripts/ops/start-control-plane-demo.sh"
    subprocess.run(
        ["shellcheck", str(script)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )

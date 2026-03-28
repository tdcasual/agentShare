from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from app.services.intake_catalog import get_intake_catalog


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "export-intake-catalog.py"
SNAPSHOT_PATH = ROOT / "apps" / "web" / "lib" / "forms" / "generated" / "intake-catalog.json"


def _load_export_module():
    spec = importlib.util.spec_from_file_location("export_intake_catalog", SCRIPT_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_export_script_emits_backend_intake_catalog_snapshot() -> None:
    module = _load_export_module()

    exported = module.build_export_payload()

    assert exported == get_intake_catalog().model_dump(mode="json")


def test_generated_web_snapshot_matches_backend_export() -> None:
    module = _load_export_module()

    snapshot = json.loads(SNAPSHOT_PATH.read_text())

    assert snapshot == module.build_export_payload()

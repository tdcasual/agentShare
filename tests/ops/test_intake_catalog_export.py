from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from app.services.intake_catalog import get_intake_catalog


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts" / "export-intake-catalog.py"
SNAPSHOT_PATH = ROOT / "apps" / "control-plane-v3" / "src" / "lib" / "forms" / "generated" / "intake-catalog.json"


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


def test_web_package_exposes_snapshot_refresh_script() -> None:
    package_json = (ROOT / "apps" / "control-plane-v3" / "package.json").read_text()

    assert '"sync:contracts": "python3 ../../scripts/export-intake-catalog.py --write"' in package_json


def test_readme_documents_snapshot_refresh_and_drift_check() -> None:
    readme = (ROOT / "README.md").read_text()

    assert "npm run sync:contracts" in readme
    assert "npm run test:contracts" in readme

#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.services.intake_catalog import get_intake_catalog  # noqa: E402


FRONTEND_PACKAGE_JSON = ROOT / "apps" / "control-plane-v3" / "package.json"
FRONTEND_SNAPSHOT_PATH = ROOT / "apps" / "control-plane-v3" / "src" / "lib" / "forms" / "generated" / "intake-catalog.json"


def backend_contract_snapshot() -> dict:
    return get_intake_catalog().model_dump(mode="json")


def frontend_contract_snapshot() -> dict:
    if not FRONTEND_SNAPSHOT_PATH.exists():
        raise RuntimeError(f"Frontend snapshot is missing: {FRONTEND_SNAPSHOT_PATH}")

    return json.loads(FRONTEND_SNAPSHOT_PATH.read_text())


def ensure_ci_runs_drift_check() -> list[str]:
    failures: list[str] = []

    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    if "npm run test:contracts" not in ci_workflow:
        failures.append("CI workflow must run `npm run test:contracts`.")

    package_json = FRONTEND_PACKAGE_JSON.read_text()
    if '"test:contracts": "python3 ../../scripts/check-intake-drift.py"' not in package_json:
        failures.append("apps/control-plane-v3/package.json must expose `test:contracts`.")

    return failures


def compare_contract_summaries(backend: dict, frontend: dict) -> list[str]:
    if "resource_kinds" in backend or "resource_kinds" in frontend:
        return [] if backend == frontend else ["Frontend intake snapshot drifted from backend export."]

    failures: list[str] = []

    for resource_type, backend_summary in backend.items():
        frontend_summary = frontend.get(resource_type)
        if frontend_summary is None:
            failures.append(f"{resource_type} is missing from frontend contract summaries")
            continue

        backend_default = backend_summary.get("default_variant")
        frontend_default = frontend_summary.get("default_variant")
        if backend_default != frontend_default:
            failures.append(
                f"{resource_type} default variant drifted: backend={backend_default!r} frontend={frontend_default!r}"
            )
            continue

        backend_variants = backend_summary.get("variants", {})
        frontend_variants = frontend_summary.get("variants", {})
        for variant_name, backend_variant in backend_variants.items():
            frontend_variant = frontend_variants.get(variant_name)
            if frontend_variant != backend_variant:
                failures.append(
                    f"{resource_type} variant {variant_name!r} drifted between backend and frontend contract summaries"
                )

    for resource_type in frontend:
        if resource_type not in backend:
            failures.append(f"{resource_type} exists in frontend contract summaries but not backend")

    return failures


def main() -> int:
    failures = ensure_ci_runs_drift_check()
    backend = backend_contract_snapshot()
    try:
        frontend = frontend_contract_snapshot()
    except RuntimeError as exc:
        failures.append(str(exc))
        frontend = None

    if frontend is not None:
        failures.extend(compare_contract_summaries(backend, frontend))

    if failures:
        print("Intake drift check failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Intake drift check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

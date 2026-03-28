#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.services.intake_catalog import get_intake_catalog  # noqa: E402


FRONTEND_VARIANT_PATTERNS = {
    "secret": (
        ROOT / "apps/web/lib/forms/secrets-contracts.ts",
        re.compile(r'variant:\s*"([^"]+)"'),
    ),
    "capability": (
        ROOT / "apps/web/lib/forms/capabilities-contracts.ts",
        re.compile(r'variant:\s*"([^"]+)"'),
    ),
    "task": (
        ROOT / "apps/web/lib/forms/tasks-contracts.ts",
        re.compile(r'createTaskContract\(\s*"([^"]+)"'),
    ),
    "agent": (
        ROOT / "apps/web/lib/forms/agents-contracts.ts",
        re.compile(r'createAgentContract\(\s*"([^"]+)"'),
    ),
}


def frontend_variants() -> dict[str, set[str]]:
    variants: dict[str, set[str]] = {}
    for kind, (path, pattern) in FRONTEND_VARIANT_PATTERNS.items():
        variants[kind] = set(pattern.findall(path.read_text()))
    return variants


def backend_variants() -> dict[str, set[str]]:
    catalog = get_intake_catalog()
    return {
        resource.kind: {variant.variant for variant in resource.variants}
        for resource in catalog.resource_kinds
    }


def ensure_ci_runs_drift_check() -> list[str]:
    failures: list[str] = []

    ci_workflow = (ROOT / ".github/workflows/ci.yml").read_text()
    if "npm run test:contracts" not in ci_workflow:
        failures.append("CI workflow must run `npm run test:contracts`.")

    package_json = (ROOT / "apps/web/package.json").read_text()
    if '"test:contracts": "python3 ../../scripts/check-intake-drift.py"' not in package_json:
        failures.append("apps/web/package.json must expose `test:contracts`.")

    return failures


def main() -> int:
    failures = ensure_ci_runs_drift_check()
    backend = backend_variants()
    frontend = frontend_variants()

    for kind, backend_set in backend.items():
        frontend_set = frontend.get(kind, set())
        if backend_set != frontend_set:
            failures.append(
                f"{kind} variants drifted: backend={sorted(backend_set)} frontend={sorted(frontend_set)}"
            )

    if failures:
        print("Intake drift check failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("Intake drift check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

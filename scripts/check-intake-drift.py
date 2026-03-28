#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.services.intake_catalog import get_intake_catalog  # noqa: E402


FRONTEND_CONTRACT_SUMMARY_SCRIPT = ROOT / "apps/web" / "scripts" / "print-contract-summary.ts"


def _normalize_default_value(value):
    return None if value in (None, "") else value


def _summarize_field(field) -> dict:
    return {
        "key": field.key,
        "control": field.control,
        "required": bool(field.required),
        "advanced": bool(field.advanced),
        "read_only": bool(field.read_only),
        "default_value": _normalize_default_value(field.default_value),
        "options_source": field.options_source,
        "option_values": [option.value for option in field.options],
    }


def _summarize_variant(variant) -> dict:
    return {
        "title": {
            "en": variant.title.en,
            "zh": variant.title.zh,
        },
        "summary": {
            "en": variant.summary.en,
            "zh": variant.summary.zh,
        },
        "sections": [
            {
                "id": section.id,
                "title": {
                    "en": section.title.en,
                    "zh": section.title.zh,
                },
                "fields": [_summarize_field(field) for field in section.fields],
            }
            for section in variant.sections
        ],
    }


def backend_contract_summaries() -> dict[str, dict]:
    catalog = get_intake_catalog()
    return {
        resource.kind: {
            "default_variant": resource.default_variant,
            "variants": {
                variant.variant: _summarize_variant(variant)
                for variant in resource.variants
            },
        }
        for resource in catalog.resource_kinds
    }


def frontend_contract_summaries() -> dict[str, dict]:
    try:
        result = subprocess.run(
            ["npx", "tsx", str(FRONTEND_CONTRACT_SUMMARY_SCRIPT.relative_to(ROOT / "apps/web"))],
            cwd=ROOT / "apps/web",
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        message = exc.stderr.strip() or exc.stdout.strip() or str(exc)
        raise RuntimeError(f"Could not load frontend contract summary: {message}") from exc

    return json.loads(result.stdout)


def compare_contract_summaries(
    backend: dict[str, dict],
    frontend: dict[str, dict],
) -> list[str]:
    failures: list[str] = []

    for kind, backend_resource in backend.items():
        frontend_resource = frontend.get(kind)
        if frontend_resource is None:
            failures.append(f"{kind} contract summary missing from frontend export")
            continue

        backend_default = backend_resource["default_variant"]
        frontend_default = frontend_resource.get("default_variant")
        if backend_default != frontend_default:
            failures.append(
                f"{kind} default variant drifted: backend={backend_default!r} frontend={frontend_default!r}"
            )

        backend_variants = backend_resource["variants"]
        frontend_variants = frontend_resource.get("variants", {})
        if set(backend_variants) != set(frontend_variants):
            failures.append(
                f"{kind} variants drifted: backend={sorted(backend_variants)} frontend={sorted(frontend_variants)}"
            )
            continue

        for variant, backend_summary in backend_variants.items():
            frontend_summary = frontend_variants.get(variant)
            if frontend_summary != backend_summary:
                failures.append(
                    f"{kind} variant '{variant}' drifted between backend and frontend contract summaries"
                )

    return failures


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
    backend = backend_contract_summaries()
    try:
        frontend = frontend_contract_summaries()
    except RuntimeError as exc:
        failures.append(str(exc))
        frontend = {}

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

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "apps/api"))

from app.services.intake_catalog import get_intake_catalog  # noqa: E402


DEFAULT_OUTPUT_PATH = ROOT / "apps" / "web" / "lib" / "forms" / "generated" / "intake-catalog.json"


def build_export_payload() -> dict:
    return get_intake_catalog().model_dump(mode="json")


def write_export_payload(output_path: Path = DEFAULT_OUTPUT_PATH) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(build_export_payload(), indent=2, ensure_ascii=False) + "\n",
    )
    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Export backend intake catalog for frontend fallback usage.")
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write the catalog JSON to the default frontend snapshot path.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="Override the output path when used with --write.",
    )
    args = parser.parse_args()

    if args.write:
        path = write_export_payload(args.output)
        print(path)
        return 0

    print(json.dumps(build_export_payload(), indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

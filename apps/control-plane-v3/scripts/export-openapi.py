"""Emit the canonical VaultGate OpenAPI document for frontend type generation."""

from __future__ import annotations

import json
import sys

from app.config import Settings
from app.factory import create_app


def main() -> None:
    app = create_app(Settings())
    json.dump(app.openapi(), sys.stdout, ensure_ascii=False, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

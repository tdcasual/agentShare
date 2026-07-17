from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "apps/api/alembic/versions"
DESTRUCTIVE_CALLS = frozenset({"drop_column", "drop_table"})
APPROVAL_VARIABLE = "DESTRUCTIVE_MIGRATION_APPROVED"


def _upgrade_function(tree: ast.Module) -> ast.FunctionDef | None:
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == "upgrade":
            return node
    return None


def _has_explicit_approval(tree: ast.Module) -> bool:
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(
            isinstance(target, ast.Name) and target.id == APPROVAL_VARIABLE
            for target in node.targets
        ):
            return isinstance(node.value, ast.Constant) and bool(node.value.value)
    return False


def destructive_upgrade_calls(path: Path) -> list[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    upgrade = _upgrade_function(tree)
    if upgrade is None or _has_explicit_approval(tree):
        return []

    violations: list[str] = []
    for node in ast.walk(upgrade):
        if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
            continue
        if node.func.attr in DESTRUCTIVE_CALLS:
            violations.append(f"{path.name}:{node.lineno}:{node.func.attr}")
    return violations


def main() -> int:
    violations = [
        violation
        for path in sorted(MIGRATIONS.glob("*.py"))
        for violation in destructive_upgrade_calls(path)
    ]
    if violations:
        print("Destructive upgrade operations require a reviewed expand/contract plan:")
        for violation in violations:
            print(f"- {violation}")
        print(
            f"Set {APPROVAL_VARIABLE} to a non-empty change ticket only after explicit review."
        )
        return 1
    print("Migration policy check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

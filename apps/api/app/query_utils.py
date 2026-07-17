from __future__ import annotations


def contains_pattern(value: str) -> str:
    """Build a LIKE pattern that treats user input as literal text."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"

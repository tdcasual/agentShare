from __future__ import annotations

from uuid import uuid4


def new_resource_id(prefix: str) -> str:
    normalized_prefix = prefix.strip().lower()
    return f"{normalized_prefix}-{uuid4().hex}"

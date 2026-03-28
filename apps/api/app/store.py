from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.identifiers import new_resource_id


@dataclass
class Store:
    secrets: dict[str, dict[str, Any]] = field(default_factory=dict)
    secret_values: dict[str, str] = field(default_factory=dict)
    capabilities: dict[str, dict[str, Any]] = field(default_factory=dict)
    tasks: dict[str, dict[str, Any]] = field(default_factory=dict)
    runs: list[dict[str, Any]] = field(default_factory=list)
    playbooks: dict[str, dict[str, Any]] = field(default_factory=dict)
    audit_events: list[dict[str, Any]] = field(default_factory=list)


store = Store()


def next_id(prefix: str) -> str:
    return new_resource_id(prefix)


def reset_store() -> None:
    fresh = Store()
    store.secrets.clear()
    store.secret_values.clear()
    store.capabilities.clear()
    store.tasks.clear()
    store.runs.clear()
    store.playbooks.clear()
    store.audit_events.clear()

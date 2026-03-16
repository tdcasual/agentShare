from __future__ import annotations

from dataclasses import dataclass, field
from itertools import count
from typing import Any


@dataclass
class Store:
    secrets: dict[str, dict[str, Any]] = field(default_factory=dict)
    secret_values: dict[str, str] = field(default_factory=dict)
    capabilities: dict[str, dict[str, Any]] = field(default_factory=dict)
    tasks: dict[str, dict[str, Any]] = field(default_factory=dict)
    runs: list[dict[str, Any]] = field(default_factory=list)
    playbooks: dict[str, dict[str, Any]] = field(default_factory=dict)
    audit_events: list[dict[str, Any]] = field(default_factory=list)
    counters: dict[str, Any] = field(
        default_factory=lambda: {
            "secret": count(1),
            "capability": count(1),
            "task": count(1),
            "run": count(1),
            "playbook": count(1),
            "lease": count(1),
        }
    )


store = Store()


def next_id(prefix: str) -> str:
    return f"{prefix}-{next(store.counters[prefix])}"


def reset_store() -> None:
    fresh = Store()
    store.secrets.clear()
    store.secret_values.clear()
    store.capabilities.clear()
    store.tasks.clear()
    store.runs.clear()
    store.playbooks.clear()
    store.audit_events.clear()
    store.counters = fresh.counters

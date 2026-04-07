from __future__ import annotations

from typing import Any


OPENCLAW_TOOL_CATALOG: dict[str, dict[str, Any]] = {
    "tasks.list": {
        "legacy_name": "list_tasks",
        "description": "List visible tasks for the current runtime session.",
    },
    "tasks.claim": {
        "legacy_name": "claim_task",
        "description": "Claim one pending task for the current runtime session.",
    },
    "tasks.complete": {
        "legacy_name": "complete_task",
        "description": "Complete one claimed task and persist the resulting run output.",
    },
    "playbooks.search": {
        "legacy_name": "search_playbooks",
        "description": "Search reusable playbooks by task type, text query, and tag.",
    },
    "capabilities.invoke": {
        "legacy_name": "invoke_capability",
        "description": "Invoke a capability with policy and approval enforcement.",
    },
    "capabilities.request_lease": {
        "legacy_name": "request_capability_lease",
        "description": "Request a short-lived capability lease for a claimed task.",
    },
}

LEGACY_TOOL_ALIASES = {
    value["legacy_name"]: name for name, value in OPENCLAW_TOOL_CATALOG.items()
}


def canonical_tool_name(name: str) -> str | None:
    if name in OPENCLAW_TOOL_CATALOG:
        return name
    return LEGACY_TOOL_ALIASES.get(name)


def list_openclaw_tool_catalog() -> list[dict[str, Any]]:
    return [
        {
            "name": name,
            "description": config["description"],
            "legacy_name": config["legacy_name"],
        }
        for name, config in OPENCLAW_TOOL_CATALOG.items()
    ]

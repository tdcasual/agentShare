from __future__ import annotations

from typing import Any


OPENCLAW_TOOL_CATALOG: dict[str, dict[str, Any]] = {
    "tasks.list": {
        "description": "List visible tasks for the current runtime session.",
    },
    "tasks.claim": {
        "description": "Claim one pending task for the current runtime session.",
    },
    "tasks.complete": {
        "description": "Complete one claimed task and persist the resulting run output.",
    },
    "playbooks.search": {
        "description": "Search reusable playbooks by task type, text query, and tag.",
    },
    "capabilities.invoke": {
        "description": "Invoke a capability with policy and approval enforcement.",
    },
    "capabilities.request_lease": {
        "description": "Request a short-lived capability lease for a claimed task.",
    },
    "dream.runs.start": {
        "description": "Start one bounded autonomous dream run for the current runtime session.",
    },
    "dream.runs.record_step": {
        "description": "Record one explicit plan, reflect, or follow-up step in a dream run.",
    },
    "dream.runs.stop": {
        "description": "Stop one active dream run with an explicit stop reason.",
    },
    "dream.memory.search": {
        "description": "Search explicit dream memory notes for the current runtime agent.",
    },
    "dream.memory.write": {
        "description": "Persist one explicit dream memory note for the current runtime agent.",
    },
    "dream.tasks.propose_followup": {
        "description": "Create one follow-up task proposal from the current dream run when policy allows.",
    },
}

def canonical_tool_name(name: str) -> str | None:
    if name in OPENCLAW_TOOL_CATALOG:
        return name
    return None


def list_openclaw_tool_catalog() -> list[dict[str, Any]]:
    return [
        {
            "name": name,
            "description": config["description"],
        }
        for name, config in OPENCLAW_TOOL_CATALOG.items()
    ]

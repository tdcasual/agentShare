from __future__ import annotations

import importlib
import typing

import pytest


MODULES_WITH_RUNTIME_PRINCIPAL_ANNOTATIONS = [
    "app.routes.invoke",
    "app.routes.runtime",
    "app.routes.leases",
    "app.routes.openclaw_memory",
    "app.routes.openclaw_dream_runs",
    "app.routes.tasks",
    "app.mcp.server",
    "app.mcp.tools",
    "app.services.gateway",
    "app.services.task_service",
    "app.services.openclaw_memory_service",
    "app.services.openclaw_dream_service",
    "app.services.openclaw_dream_policy_service",
]


@pytest.mark.parametrize("module_name", MODULES_WITH_RUNTIME_PRINCIPAL_ANNOTATIONS)
def test_runtime_principal_type_hints_resolve(module_name: str) -> None:
    module = importlib.import_module(module_name)
    failures: list[str] = []

    for name, obj in sorted(vars(module).items()):
        if getattr(obj, "__module__", None) != module_name or not callable(obj):
            continue

        try:
            typing.get_type_hints(obj)
        except Exception as exc:  # pragma: no cover - failure path is asserted below
            failures.append(f"{name}: {type(exc).__name__}: {exc}")

    assert failures == []

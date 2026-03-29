from __future__ import annotations

from fastapi import Depends, Request

from app.config import Settings
from app.runtime import AppRuntime

RUNTIME_MISSING_MESSAGE = (
    "App runtime is not attached to FastAPI state. Build the application through create_app()."
)


def get_attached_runtime(request: Request) -> AppRuntime:
    runtime = getattr(request.app.state, "runtime", None)
    if runtime is None:
        raise RuntimeError(RUNTIME_MISSING_MESSAGE)
    return runtime


def get_runtime(request: Request) -> AppRuntime:
    return get_attached_runtime(request)


def get_settings(runtime: AppRuntime = Depends(get_runtime)) -> Settings:
    return runtime.settings

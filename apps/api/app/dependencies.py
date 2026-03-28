from __future__ import annotations

from fastapi import Depends, Request

from app.config import Settings
from app.runtime import AppRuntime


def get_runtime(request: Request) -> AppRuntime:
    return request.app.state.runtime


def get_settings(runtime: AppRuntime = Depends(get_runtime)) -> Settings:
    return runtime.settings

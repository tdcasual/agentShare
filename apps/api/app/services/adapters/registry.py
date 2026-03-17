from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.adapters.base import CapabilityAdapter

_registry: dict[str, "CapabilityAdapter"] = {}


def register_adapter(name: str, adapter: "CapabilityAdapter") -> None:
    _registry[name] = adapter


def get_adapter(name: str) -> "CapabilityAdapter":
    if name not in _registry:
        raise KeyError(f"Unknown adapter: {name}")
    return _registry[name]


def _bootstrap_defaults() -> None:
    from app.services.adapters.generic_http import GenericHttpAdapter

    register_adapter("generic_http", GenericHttpAdapter())


_bootstrap_defaults()

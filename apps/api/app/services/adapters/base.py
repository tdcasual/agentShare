from __future__ import annotations
from typing import Any, Protocol, runtime_checkable

import httpx
from json import JSONDecodeError


@runtime_checkable
class CapabilityAdapter(Protocol):
    def invoke(
        self,
        secret_value: str,
        adapter_config: dict[str, Any],
        parameters: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute a capability invocation and return the result."""
        ...


def normalize_json_response(adapter_type: str, response: httpx.Response) -> dict[str, Any]:
    response.raise_for_status()
    body: Any
    try:
        body = response.json()
    except (JSONDecodeError, UnicodeDecodeError):
        body = response.text or None
    return {
        "adapter_type": adapter_type,
        "upstream_status": response.status_code,
        "body": body,
    }

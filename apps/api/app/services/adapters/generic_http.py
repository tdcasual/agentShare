from __future__ import annotations
from typing import Any

import httpx

from app.services.adapters.base import normalize_json_response


class GenericHttpAdapter:
    """Adapter that proxies requests to an arbitrary HTTP endpoint,
    injecting the secret as a bearer token."""

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client or httpx.Client(timeout=30)

    def _request(self, method: str, **request_kwargs: Any):
        return self._client.request(method, **request_kwargs)

    def invoke(
        self,
        secret_value: str,
        adapter_config: dict[str, Any],
        parameters: dict[str, Any],
    ) -> dict[str, Any]:
        url = adapter_config["url"]
        method = adapter_config.get("method", "POST").upper()
        auth_header = adapter_config.get("auth_header", "Authorization")
        auth_value = (
            secret_value
            if auth_header != "Authorization"
            else f"Bearer {secret_value}"
        )

        headers = {
            auth_header: auth_value,
            "Content-Type": "application/json",
        }

        request_kwargs = {"url": url, "headers": headers}
        if method == "GET":
            request_kwargs["params"] = parameters
        else:
            request_kwargs["json"] = parameters

        resp = self._request(method, **request_kwargs)

        return normalize_json_response("generic_http", resp)

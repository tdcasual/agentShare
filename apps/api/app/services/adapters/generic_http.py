from __future__ import annotations
from typing import Any

import httpx


class GenericHttpAdapter:
    """Adapter that proxies requests to an arbitrary HTTP endpoint,
    injecting the secret as a bearer token."""

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

        if method == "POST":
            resp = httpx.post(url=url, json=parameters, headers=headers, timeout=30)
        elif method == "GET":
            resp = httpx.get(url=url, params=parameters, headers=headers, timeout=30)
        else:
            resp = httpx.request(
                method, url=url, json=parameters, headers=headers, timeout=30
            )

        resp.raise_for_status()
        return {"status_code": resp.status_code, "body": resp.json()}

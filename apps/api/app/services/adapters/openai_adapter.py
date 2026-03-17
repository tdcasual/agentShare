from __future__ import annotations

from typing import Any

import httpx

OPENAI_DEFAULT_BASE = "https://api.openai.com/v1"


class OpenAIAdapter:
    """Adapter for OpenAI Chat Completions API."""

    def invoke(
        self,
        secret_value: str,
        adapter_config: dict[str, Any],
        parameters: dict[str, Any],
    ) -> dict[str, Any]:
        base_url = adapter_config.get("base_url", OPENAI_DEFAULT_BASE).rstrip("/")
        model = adapter_config.get("model", "gpt-4")
        url = f"{base_url}/chat/completions"

        body: dict[str, Any] = {
            "model": model,
            "messages": parameters.get("messages", []),
        }
        # Pass through optional OpenAI params
        for key in ("temperature", "max_tokens", "top_p", "stream", "stop"):
            if key in parameters:
                body[key] = parameters[key]

        resp = httpx.post(
            url=url,
            json=body,
            headers={
                "Authorization": f"Bearer {secret_value}",
                "Content-Type": "application/json",
            },
            timeout=60,
        )
        resp.raise_for_status()
        return {"status_code": resp.status_code, "body": resp.json()}

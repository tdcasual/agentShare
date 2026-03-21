from __future__ import annotations

from string import Formatter
from typing import Any
from urllib.parse import quote

import httpx

from app.services.adapters.base import normalize_json_response

GITHUB_DEFAULT_BASE = "https://api.github.com"


class GitHubAdapter:
    """Opinionated adapter for GitHub REST API calls with bearer-token auth."""

    def invoke(
        self,
        secret_value: str,
        adapter_config: dict[str, Any],
        parameters: dict[str, Any],
    ) -> dict[str, Any]:
        base_url = adapter_config.get("base_url", GITHUB_DEFAULT_BASE).rstrip("/")
        method = adapter_config.get("method", "GET").upper()
        path_template = adapter_config["path"]
        path_param_names = {
            field_name
            for _, field_name, _, _ in Formatter().parse(path_template)
            if field_name
        }
        missing = sorted(name for name in path_param_names if name not in parameters)
        if missing:
            raise KeyError(f"Missing GitHub path parameters: {', '.join(missing)}")

        encoded_path_params = {
            name: quote(str(parameters[name]), safe="")
            for name in path_param_names
        }
        path = path_template.format(**encoded_path_params)
        payload = {
            key: value
            for key, value in parameters.items()
            if key not in path_param_names
        }
        url = f"{base_url}/{path.lstrip('/')}"
        headers = {
            "Authorization": f"Bearer {secret_value}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": adapter_config.get("api_version", "2022-11-28"),
        }

        if method == "GET":
            response = httpx.get(url=url, params=payload, headers=headers, timeout=30)
        elif method == "POST":
            response = httpx.post(url=url, json=payload, headers=headers, timeout=30)
        else:
            response = httpx.request(
                method=method,
                url=url,
                json=payload,
                headers=headers,
                timeout=30,
            )

        return normalize_json_response("github", response)

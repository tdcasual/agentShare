from __future__ import annotations


def build_secret_scope(
    *,
    provider: str,
    environment: str | None,
    provider_scopes: list[str] | None,
    resource_selector: str | None,
) -> dict:
    return {
        "provider": provider,
        "environment": environment,
        "provider_scopes": provider_scopes or [],
        "resource_selector": resource_selector,
    }

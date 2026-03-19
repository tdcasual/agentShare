from __future__ import annotations

from typing import Any


def ensure_binding_compatible(secret: Any, capability: Any) -> None:
    errors = compatibility_errors(secret, capability)
    if errors:
        raise ValueError("; ".join(errors))


def ensure_runtime_compatible(secret: Any, capability: Any) -> None:
    errors = compatibility_errors(secret, capability)
    if errors:
        raise PermissionError("; ".join(errors))


def ensure_secret_satisfies_capability(secret: Any, capability: Any, error_cls: type[Exception] = ValueError) -> None:
    errors = compatibility_errors(secret, capability)
    if errors:
        raise error_cls("; ".join(errors))


def compatibility_errors(secret: Any, capability: Any) -> list[str]:
    errors: list[str] = []

    secret_provider = _read(secret, "provider") or _legacy_scope(secret).get("provider")
    required_provider = _read(capability, "required_provider")
    if required_provider and secret_provider != required_provider:
        errors.append(f"Secret provider {secret_provider or 'unknown'} does not satisfy required provider {required_provider}")

    secret_environment = _read(secret, "environment") or _legacy_scope(secret).get("environment")
    allowed_environments = _as_list(_read(capability, "allowed_environments"))
    if allowed_environments and secret_environment not in allowed_environments:
        errors.append("Secret environment is outside the capability contract")

    secret_scopes = set(_as_list(_read(secret, "provider_scopes") or _legacy_scope(secret).get("provider_scopes")))
    required_scopes = set(_as_list(_read(capability, "required_provider_scopes")))
    missing_scopes = sorted(required_scopes - secret_scopes)
    if missing_scopes:
        errors.append(f"Secret is missing provider scopes: {', '.join(missing_scopes)}")

    return errors


def _read(value: Any, field: str) -> Any:
    if isinstance(value, dict):
        return value.get(field)
    return getattr(value, field, None)


def _legacy_scope(value: Any) -> dict[str, Any]:
    scope = _read(value, "scope")
    return scope if isinstance(scope, dict) else {}


def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    return []

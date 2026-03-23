from __future__ import annotations

from itertools import count

import httpx

from app.config import Settings


# Module-level counter for generating unique secret IDs across all backends
_secret_counter = count(1)


def _next_secret_id() -> str:
    return f"secret-{next(_secret_counter)}"


def reset_secret_counter() -> None:
    """Reset the counter (used by tests if needed)."""
    global _secret_counter
    _secret_counter = count(1)


class SecretBackend:
    backend_name = "base"

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or Settings()

    def write_secret(self, value: str) -> tuple[str, str]:
        raise NotImplementedError

    def read_secret(self, secret_id: str, backend_ref: str | None = None) -> str:
        raise NotImplementedError


class SecretBackendConfigurationError(RuntimeError):
    pass


class InMemorySecretBackend(SecretBackend):
    backend_name = "memory"

    # Class-level store shared across all InMemorySecretBackend instances
    _store: dict[str, str] = {}

    def write_secret(self, value: str) -> tuple[str, str]:
        secret_id = _next_secret_id()
        backend_ref = f"{self.backend_name}:{secret_id}"
        InMemorySecretBackend._store[secret_id] = value
        return secret_id, backend_ref

    def read_secret(self, secret_id: str, backend_ref: str | None = None) -> str:
        return InMemorySecretBackend._store[secret_id]

    @classmethod
    def reset_store(cls) -> None:
        cls._store.clear()


class OpenBaoSecretBackend(SecretBackend):
    backend_name = "openbao"

    def __init__(
        self,
        settings: Settings | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        super().__init__(settings)
        self.transport = transport

    def write_secret(self, value: str) -> tuple[str, str]:
        secret_id = _next_secret_id()
        path = self._secret_path(secret_id)
        self._request("POST", self._kv_v2_path(self.settings.openbao_mount, path), json={"data": {"value": value}})
        backend_ref = f"{self.backend_name}:{self.settings.openbao_mount}:{path}"
        return secret_id, backend_ref

    def read_secret(self, secret_id: str, backend_ref: str | None = None) -> str:
        mount, path = self._resolve_location(secret_id, backend_ref)
        payload = self._request("GET", self._kv_v2_path(mount, path))
        return payload["data"]["data"]["value"]

    def _secret_path(self, secret_id: str) -> str:
        prefix = (self.settings.openbao_prefix or "").strip("/")
        if not prefix:
            return secret_id
        return f"{prefix}/{secret_id}"

    @staticmethod
    def _kv_v2_path(mount: str, secret_path: str) -> str:
        return f"/v1/{mount}/data/{secret_path}"

    def _resolve_location(self, secret_id: str, backend_ref: str | None) -> tuple[str, str]:
        if backend_ref and backend_ref.startswith("openbao:"):
            _, mount, path = backend_ref.split(":", 2)
            return mount, path
        return self.settings.openbao_mount, self._secret_path(secret_id)

    def _request(self, method: str, path: str, json: dict | None = None) -> dict:
        if not self.settings.openbao_addr or not self.settings.openbao_token:
            raise RuntimeError("OpenBao backend is not configured")

        with httpx.Client(
            base_url=self.settings.openbao_addr,
            headers={"X-Vault-Token": self.settings.openbao_token},
            timeout=10.0,
            transport=self.transport,
        ) as client:
            response = client.request(method, path, json=json)
            response.raise_for_status()
            return response.json()


def get_secret_backend(settings: Settings | None = None) -> SecretBackend:
    settings = settings or Settings()
    validate_secret_backend_settings(settings)
    if settings.secret_backend == "memory":
        return InMemorySecretBackend(settings)
    if settings.secret_backend == "openbao" and settings.openbao_addr and settings.openbao_token:
        return OpenBaoSecretBackend(settings)
    return InMemorySecretBackend(settings)


def get_secret_backend_for_ref(backend_ref: str | None, settings: Settings | None = None) -> SecretBackend:
    settings = settings or Settings()
    if backend_ref and backend_ref.startswith("openbao:"):
        validate_secret_backend_settings(settings)
        return OpenBaoSecretBackend(settings)
    return InMemorySecretBackend(settings)


def validate_secret_backend_settings(settings: Settings) -> None:
    if settings.secret_backend == "memory":
        if settings.is_production_like():
            raise SecretBackendConfigurationError(
                "APP_ENV staging/production does not allow SECRET_BACKEND=memory."
            )
        return

    if settings.secret_backend == "openbao":
        if settings.openbao_addr and settings.openbao_token:
            return
        if settings.is_production_like():
            raise SecretBackendConfigurationError(
                "APP_ENV staging/production requires OpenBao credentials when SECRET_BACKEND=openbao."
            )

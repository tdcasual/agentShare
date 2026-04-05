import logging

import pytest
import redis

from app.config import Settings
from app.factory import create_app


def test_create_app_logs_idempotency_degradation_in_development(monkeypatch, caplog, tmp_path):
    def fail_from_url(url: str, decode_responses: bool):
        del url, decode_responses
        raise redis.RedisError("redis unavailable")

    monkeypatch.setattr("redis.from_url", fail_from_url)
    monkeypatch.setattr("app.services.redis_client._redis_clients", {})

    with caplog.at_level(logging.WARNING):
        create_app(Settings(
            database_url=f"sqlite:///{tmp_path / 'dev-startup.db'}",
            redis_url="redis://example.invalid:6380/1",
            secret_backend="memory",
        ))

    assert "idempotency" in caplog.text.lower()
    assert "redis unavailable" in caplog.text.lower()


def test_create_app_fails_fast_on_idempotency_initialization_in_production(monkeypatch, tmp_path):
    def fail_from_url(url: str, decode_responses: bool):
        del url, decode_responses
        raise redis.RedisError("redis unavailable")

    monkeypatch.setattr("redis.from_url", fail_from_url)
    monkeypatch.setattr("app.services.redis_client._redis_clients", {})

    with pytest.raises(RuntimeError, match="Idempotency"):
        create_app(Settings(
            app_env="production",
            database_url=f"sqlite:///{tmp_path / 'prod-startup.db'}",
            redis_url="redis://example.invalid:6380/2",
            secret_backend="openbao",
            openbao_addr="https://vault.example.com",
            openbao_token="token",
            bootstrap_agent_key="custom-bootstrap-key",
            management_session_secret="custom-management-secret",
            management_session_secure=True,
        ))

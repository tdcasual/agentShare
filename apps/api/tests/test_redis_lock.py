import fakeredis
import pytest

from app.config import Settings
from app.errors import ServiceUnavailableError
from app.services.redis_client import acquire_lock, release_lock


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    """Patch get_redis to return a fakeredis instance."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.redis_client._redis_clients", {"redis://localhost:6379/0": fake})
    yield fake
    fake.flushall()


def test_acquire_lock_succeeds():
    assert acquire_lock("task:task-1:claim", ttl_seconds=10)


def test_acquire_lock_fails_when_held():
    assert acquire_lock("task:task-1:claim", ttl_seconds=10)
    assert acquire_lock("task:task-1:claim", ttl_seconds=10) is None


def test_release_lock():
    lock_token = acquire_lock("task:task-1:claim", ttl_seconds=10)
    assert lock_token
    release_lock("task:task-1:claim", lock_token)
    # After release, can acquire again
    assert acquire_lock("task:task-1:claim", ttl_seconds=10)


def test_release_lock_does_not_delete_a_newer_holder(fake_redis):
    first_token = acquire_lock("task:task-1:claim", ttl_seconds=10)
    assert first_token

    fake_redis.set("task:task-1:claim", "second-token", ex=10)

    release_lock("task:task-1:claim", first_token)

    assert fake_redis.get("task:task-1:claim") == "second-token"


def test_acquire_lock_allows_development_fallback_when_redis_unavailable(monkeypatch, caplog):
    def fail_get_redis(settings=None):
        raise RuntimeError("redis unavailable")

    monkeypatch.setattr("app.services.redis_client.get_redis", fail_get_redis)
    settings = Settings(app_env="development")

    with caplog.at_level("WARNING"):
        acquired = acquire_lock("task:task-1:claim", ttl_seconds=10, settings=settings)

    assert acquired
    assert "local fallback" in caplog.text.lower()


def test_acquire_lock_fails_closed_in_production_when_redis_unavailable(monkeypatch):
    def fail_get_redis(settings=None):
        raise RuntimeError("redis unavailable")

    monkeypatch.setattr("app.services.redis_client.get_redis", fail_get_redis)
    settings = Settings(
        app_env="production",
        secret_backend="openbao",
        openbao_addr="https://vault.example.com",
        openbao_token="token",
        bootstrap_owner_key="custom-bootstrap-key",
        management_session_secret="custom-management-session-secret",
        management_session_secure=True,
    )

    with pytest.raises(ServiceUnavailableError, match="coordination"):
        acquire_lock("task:task-1:claim", ttl_seconds=10, settings=settings)

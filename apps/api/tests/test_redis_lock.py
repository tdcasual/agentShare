import fakeredis
import pytest

from app.services.redis_client import acquire_lock, release_lock, get_redis


@pytest.fixture(autouse=True)
def fake_redis(monkeypatch):
    """Patch get_redis to return a fakeredis instance."""
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr("app.services.redis_client._redis_client", fake)
    yield fake
    fake.flushall()


def test_acquire_lock_succeeds():
    assert acquire_lock("task:task-1:claim", ttl_seconds=10) is True


def test_acquire_lock_fails_when_held():
    assert acquire_lock("task:task-1:claim", ttl_seconds=10) is True
    assert acquire_lock("task:task-1:claim", ttl_seconds=10) is False


def test_release_lock():
    acquire_lock("task:task-1:claim", ttl_seconds=10)
    release_lock("task:task-1:claim")
    # After release, can acquire again
    assert acquire_lock("task:task-1:claim", ttl_seconds=10) is True

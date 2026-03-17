from __future__ import annotations

import redis

from app.config import Settings

_settings = Settings()
_redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(_settings.redis_url, decode_responses=True)
    return _redis_client


def acquire_lock(key: str, ttl_seconds: int = 30) -> bool:
    """Try to acquire a distributed lock. Returns True if acquired."""
    r = get_redis()
    return bool(r.set(key, "1", nx=True, ex=ttl_seconds))


def release_lock(key: str) -> None:
    """Release a distributed lock."""
    r = get_redis()
    r.delete(key)

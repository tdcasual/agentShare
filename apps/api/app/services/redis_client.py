from __future__ import annotations

import logging

import redis

from app.config import Settings

_settings = Settings()
_redis_client: redis.Redis | None = None
logger = logging.getLogger(__name__)


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(_settings.redis_url, decode_responses=True)
    return _redis_client


def acquire_lock(key: str, ttl_seconds: int = 30) -> bool:
    """Try to acquire a distributed lock. Returns True if acquired."""
    try:
        r = get_redis()
        return bool(r.set(key, "1", nx=True, ex=ttl_seconds))
    except redis.RedisError:
        logger.warning("Redis unavailable while acquiring lock; allowing local fallback", extra={"key": key})
        return True


def release_lock(key: str) -> None:
    """Release a distributed lock."""
    try:
        r = get_redis()
        r.delete(key)
    except redis.RedisError:
        logger.warning("Redis unavailable while releasing lock; skipping remote release", extra={"key": key})

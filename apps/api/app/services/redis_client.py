from __future__ import annotations

import logging

import redis

from app.config import Settings

_redis_clients: dict[str, redis.Redis] = {}
logger = logging.getLogger(__name__)


def get_redis(settings: Settings | None = None) -> redis.Redis:
    current_settings = settings or Settings()
    if current_settings.redis_url not in _redis_clients:
        _redis_clients[current_settings.redis_url] = redis.from_url(
            current_settings.redis_url,
            decode_responses=True,
        )
    return _redis_clients[current_settings.redis_url]


def acquire_lock(key: str, ttl_seconds: int = 30, settings: Settings | None = None) -> bool:
    """Try to acquire a distributed lock. Returns True if acquired."""
    try:
        r = get_redis(settings)
        return bool(r.set(key, "1", nx=True, ex=ttl_seconds))
    except redis.RedisError:
        logger.warning("Redis unavailable while acquiring lock; allowing local fallback", extra={"key": key})
        return True


def release_lock(key: str, settings: Settings | None = None) -> None:
    """Release a distributed lock."""
    try:
        r = get_redis(settings)
        r.delete(key)
    except redis.RedisError:
        logger.warning("Redis unavailable while releasing lock; skipping remote release", extra={"key": key})

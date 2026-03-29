from __future__ import annotations

import logging

import redis

from app.config import Settings
from app.errors import ServiceUnavailableError

_redis_clients: dict[str, redis.Redis] = {}
logger = logging.getLogger(__name__)
COORDINATION_UNAVAILABLE_DETAIL = "Runtime coordination is unavailable"


def get_redis(settings: Settings | None = None) -> redis.Redis:
    current_settings = settings or Settings()
    if current_settings.redis_url not in _redis_clients:
        try:
            _redis_clients[current_settings.redis_url] = redis.from_url(
                current_settings.redis_url,
                decode_responses=True,
            )
        except redis.RedisError as exc:
            raise RuntimeError(
                f"Failed to initialize Redis client for {current_settings.redis_url}: {exc}"
            ) from exc
    return _redis_clients[current_settings.redis_url]


def acquire_lock(key: str, ttl_seconds: int = 30, settings: Settings | None = None) -> bool:
    """Try to acquire a distributed lock.

    Returns True when the lock is acquired or when development mode deliberately
    falls back to local-only coordination. Returns False when another holder
    already owns the lock. Raises ServiceUnavailableError in production-like
    environments if Redis coordination is unavailable.
    """
    try:
        r = get_redis(settings)
        return bool(r.set(key, "1", nx=True, ex=ttl_seconds))
    except (redis.RedisError, RuntimeError) as exc:
        current_settings = settings or Settings()
        if current_settings.is_production_like():
            logger.error(
                "Redis unavailable while acquiring lock; failing closed",
                extra={"key": key, "app_env": current_settings.app_env},
            )
            raise ServiceUnavailableError(COORDINATION_UNAVAILABLE_DETAIL) from exc

        logger.warning(
            "Redis unavailable while acquiring lock; allowing deliberate local fallback",
            extra={"key": key, "app_env": current_settings.app_env},
        )
        return True


def release_lock(key: str, settings: Settings | None = None) -> None:
    """Release a distributed lock."""
    try:
        r = get_redis(settings)
        r.delete(key)
    except (redis.RedisError, RuntimeError):
        current_settings = settings or Settings()
        logger.warning(
            "Redis unavailable while releasing lock; relying on TTL expiry",
            extra={"key": key, "app_env": current_settings.app_env},
        )

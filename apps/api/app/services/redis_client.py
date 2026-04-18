from __future__ import annotations

import logging
from uuid import uuid4

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


def acquire_lock(
    key: str,
    ttl_seconds: int = 30,
    settings: Settings | None = None,
) -> str | None:
    """Try to acquire a distributed lock.

    Returns an owner token when the lock is acquired or when development mode deliberately
    falls back to local-only coordination. Returns None when another holder
    already owns the lock. Raises ServiceUnavailableError in production-like
    environments if Redis coordination is unavailable.
    """
    lock_token = uuid4().hex
    try:
        r = get_redis(settings)
        acquired = bool(r.set(key, lock_token, nx=True, ex=ttl_seconds))
        return lock_token if acquired else None
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
        return lock_token


def release_lock(key: str, lock_token: str, settings: Settings | None = None) -> None:
    """Release a distributed lock."""
    try:
        r = get_redis(settings)
        r.eval(
            """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            end
            return 0
            """,
            1,
            key,
            lock_token,
        )
    except (redis.RedisError, RuntimeError):
        current_settings = settings or Settings()
        logger.warning(
            "Redis unavailable while releasing lock; relying on TTL expiry",
            extra={"key": key, "app_env": current_settings.app_env},
        )

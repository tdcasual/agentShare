from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from math import ceil
from typing import Any

import redis

from app.config import Settings

logger = logging.getLogger(__name__)

# In-memory fallback for local dev and when Redis is unavailable
_attempts_by_key: dict[str, list[float]] = {}


@dataclass(frozen=True)
class AuthRateLimitExceeded(Exception):
    retry_after_seconds: int


def _get_redis_or_none(settings: Settings) -> "redis.Redis | None":
    try:
        from app.services.redis_client import get_redis

        return get_redis(settings)
    except Exception:
        return None


def build_auth_rate_limit_key(*, bucket: str, client_host: str | None, subject: str) -> str:
    normalized_host = (client_host or "unknown").strip().lower() or "unknown"
    normalized_subject = subject.strip().lower() or "unknown"
    return f"{bucket}:{normalized_host}:{normalized_subject}"


def ensure_auth_attempt_allowed(
    settings: Settings,
    key: str,
    *,
    now: float | None = None,
) -> None:
    current_time = now if now is not None else time.time()
    attempts = _active_attempts(settings, key, current_time)
    if len(attempts) < settings.auth_rate_limit_max_attempts:
        return

    oldest_attempt = min(attempts)
    retry_after = max(1, ceil((oldest_attempt + settings.auth_rate_limit_window_seconds) - current_time))
    raise AuthRateLimitExceeded(retry_after)


def record_auth_failure(
    settings: Settings,
    key: str,
    *,
    now: float | None = None,
) -> None:
    current_time = now if now is not None else time.time()
    _record_failure(settings, key, current_time)


def clear_auth_failures(key: str) -> None:
    _clear_failures(key)


def reset_auth_rate_limits() -> None:
    _attempts_by_key.clear()


def _redis_key(key: str) -> str:
    return f"auth_rate_limit:{key}"


def _active_attempts(settings: Settings, key: str, now: float) -> list[float]:
    window_started_at = now - settings.auth_rate_limit_window_seconds
    r = _get_redis_or_none(settings)
    if r is not None:
        try:
            return _redis_active_attempts(r, key, window_started_at, settings.auth_rate_limit_window_seconds)
        except (redis.RedisError, RuntimeError):
            logger.warning("Redis unavailable for auth rate limit; falling back to memory")
    return _memory_active_attempts(key, window_started_at)


def _record_failure(settings: Settings, key: str, now: float) -> None:
    r = _get_redis_or_none(settings)
    if r is not None:
        try:
            _redis_record_failure(r, key, now, settings.auth_rate_limit_window_seconds)
            return
        except (redis.RedisError, RuntimeError):
            logger.warning("Redis unavailable for auth rate limit; falling back to memory")
    attempts = _memory_active_attempts(key, now - settings.auth_rate_limit_window_seconds)
    attempts.append(now)
    _attempts_by_key[key] = attempts


def _clear_failures(key: str) -> None:
    # Memory fallback — also attempted for Redis in case Redis is temporarily down
    _attempts_by_key.pop(key, None)
    # Redis cleanup is handled by TTL, but explicit removal is harmless


# --- Memory fallback implementations ---


def _memory_active_attempts(key: str, window_started_at: float) -> list[float]:
    attempts = [attempt for attempt in _attempts_by_key.get(key, []) if attempt > window_started_at]
    if attempts:
        _attempts_by_key[key] = attempts
    else:
        _attempts_by_key.pop(key, None)
    return attempts


# --- Redis-backed implementations ---


def _redis_active_attempts(
    r: "redis.Redis",
    key: str,
    window_started_at: float,
    window_seconds: int,
) -> list[float]:
    redis_key = _redis_key(key)
    # Remove stale attempts outside the window
    r.zremrangebyscore(redis_key, 0, window_started_at)
    # Ensure TTL in case it wasn't set
    r.expire(redis_key, window_seconds)
    # Get remaining attempts
    raw_attempts: Any = r.zrange(redis_key, 0, -1, withscores=False)
    return [float(a) for a in raw_attempts]


def _redis_record_failure(
    r: "redis.Redis",
    key: str,
    now: float,
    window_seconds: int,
) -> None:
    redis_key = _redis_key(key)
    r.zadd(redis_key, {str(now): now})
    r.expire(redis_key, window_seconds)

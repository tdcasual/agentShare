from __future__ import annotations

import time
from dataclasses import dataclass
from math import ceil

from app.config import Settings


_attempts_by_key: dict[str, list[float]] = {}


@dataclass(frozen=True)
class AuthRateLimitExceeded(Exception):
    retry_after_seconds: int


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
    attempts = _active_attempts(settings, key, current_time)
    attempts.append(current_time)
    _attempts_by_key[key] = attempts


def clear_auth_failures(key: str) -> None:
    _attempts_by_key.pop(key, None)


def reset_auth_rate_limits() -> None:
    _attempts_by_key.clear()


def _active_attempts(settings: Settings, key: str, now: float) -> list[float]:
    window_started_at = now - settings.auth_rate_limit_window_seconds
    attempts = [attempt for attempt in _attempts_by_key.get(key, []) if attempt > window_started_at]
    if attempts:
        _attempts_by_key[key] = attempts
    else:
        _attempts_by_key.pop(key, None)
    return attempts

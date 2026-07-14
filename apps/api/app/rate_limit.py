"""In-memory rate limiter for authentication endpoints.

Tracks failed login attempts by IP address and blocks further attempts
after exceeding the configured threshold within the time window.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from hashlib import sha256
from threading import RLock
from time import monotonic
from typing import NamedTuple

from fastapi import Request
from fastapi.responses import JSONResponse

from app.client_ip import get_client_ip

logger = logging.getLogger("app.rate_limit")


class RateLimitConfig(NamedTuple):
    max_attempts: int
    window_seconds: int


class _RateLimitStore:
    """Process-local, thread-safe store for recent authentication failures."""

    _MAX_TRACKED_IPS = 10_000

    def __init__(self) -> None:
        # ip -> list of failure timestamps
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._lock = RLock()

    def _prune_stale_keys(self, cutoff: float) -> None:
        """Remove expired and oldest buckets to enforce the memory bound."""
        active = {
            key: [timestamp for timestamp in attempts if timestamp > cutoff]
            for key, attempts in self._failures.items()
        }
        active = {key: attempts for key, attempts in active.items() if attempts}
        if len(active) > self._MAX_TRACKED_IPS:
            oldest_first = sorted(active, key=lambda key: active[key][-1])
            for key in oldest_first[: len(active) - self._MAX_TRACKED_IPS]:
                del active[key]
        self._failures = defaultdict(list, active)

    def record_failure(self, ip: str, window_seconds: int) -> int:
        """Record a failed attempt and return the current count within the window."""
        with self._lock:
            now = monotonic()
            cutoff = now - window_seconds
            attempts = self._failures[ip]
            self._failures[ip] = [timestamp for timestamp in attempts if timestamp > cutoff]
            self._failures[ip].append(now)
            self._prune_stale_keys(cutoff)
            return len(self._failures[ip])

    def get_attempt_count(self, ip: str, window_seconds: int) -> int:
        """Get the number of recent failed attempts within the window."""
        with self._lock:
            now = monotonic()
            cutoff = now - window_seconds
            attempts = self._failures.get(ip, [])
            return sum(1 for timestamp in attempts if timestamp > cutoff)

    def clear(self, ip: str) -> None:
        """Clear all recorded failures for an IP (e.g., after successful login)."""
        with self._lock:
            self._failures.pop(ip, None)


# Module-level singleton
_store = _RateLimitStore()


def _rate_limit_key(request: Request, identifier: str | None) -> str:
    client_ip = get_client_ip(request)
    if identifier is None:
        return client_ip
    identifier_hash = sha256(identifier.strip().lower().encode()).hexdigest()
    return f"{client_ip}|{identifier_hash}"


def check_rate_limit(
    request: Request,
    config: RateLimitConfig,
    identifier: str | None = None,
) -> JSONResponse | None:
    """Check if the request should be rate-limited.

    Returns a 429 JSONResponse if rate-limited, or None if the request is allowed.
    """
    key = _rate_limit_key(request, identifier)
    attempt_count = _store.get_attempt_count(key, config.window_seconds)

    if attempt_count >= config.max_attempts:
        logger.warning(
            "Rate limit exceeded for IP %s: %d attempts in %d seconds",
            get_client_ip(request), attempt_count, config.window_seconds,
        )
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Too many failed login attempts. Try again in {config.window_seconds} seconds.",
            },
        )
    return None


def record_failed_attempt(
    request: Request,
    config: RateLimitConfig,
    identifier: str | None = None,
) -> int:
    """Record a failed login attempt and return the current count."""
    key = _rate_limit_key(request, identifier)
    count = _store.record_failure(key, config.window_seconds)
    logger.info(
        "Failed login attempt from IP %s (%d/%d)",
        get_client_ip(request),
        count,
        config.max_attempts,
    )
    return count


def clear_attempts(request: Request, identifier: str | None = None) -> None:
    """Clear failed attempts for the client IP (e.g., after successful login)."""
    _store.clear(_rate_limit_key(request, identifier))

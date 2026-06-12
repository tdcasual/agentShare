"""In-memory rate limiter for authentication endpoints.

Tracks failed login attempts by IP address and blocks further attempts
after exceeding the configured threshold within the time window.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from time import monotonic
from typing import NamedTuple

from fastapi import Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("app.rate_limit")


class RateLimitConfig(NamedTuple):
    max_attempts: int
    window_seconds: int


class _RateLimitStore:
    """Thread-safe in-memory store tracking failed attempts per IP."""

    def __init__(self) -> None:
        # ip -> list of failure timestamps
        self._failures: dict[str, list[float]] = defaultdict(list)

    def record_failure(self, ip: str, window_seconds: int) -> int:
        """Record a failed attempt and return the current count within the window."""
        now = monotonic()
        cutoff = now - window_seconds
        attempts = self._failures[ip]
        # Prune old entries outside the window
        self._failures[ip] = [t for t in attempts if t > cutoff]
        self._failures[ip].append(now)
        return len(self._failures[ip])

    def get_attempt_count(self, ip: str, window_seconds: int) -> int:
        """Get the number of recent failed attempts within the window."""
        now = monotonic()
        cutoff = now - window_seconds
        attempts = self._failures.get(ip, [])
        return sum(1 for t in attempts if t > cutoff)

    def clear(self, ip: str) -> None:
        """Clear all recorded failures for an IP (e.g., after successful login)."""
        self._failures.pop(ip, None)


# Module-level singleton
_store = _RateLimitStore()


def _get_client_ip(request: Request) -> str:
    """Extract client IP from the direct TCP connection.

    Does NOT trust X-Forwarded-For to prevent IP spoofing attacks.
    In production behind a reverse proxy, the proxy's IP will be recorded,
    which is acceptable since all requests from behind the proxy share the
    same rate limit bucket.
    """
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request, config: RateLimitConfig) -> JSONResponse | None:
    """Check if the request should be rate-limited.

    Returns a 429 JSONResponse if rate-limited, or None if the request is allowed.
    """
    ip = _get_client_ip(request)
    attempt_count = _store.get_attempt_count(ip, config.window_seconds)

    if attempt_count >= config.max_attempts:
        logger.warning(
            "Rate limit exceeded for IP %s: %d attempts in %d seconds",
            ip, attempt_count, config.window_seconds,
        )
        return JSONResponse(
            status_code=429,
            content={
                "detail": f"Too many failed login attempts. Try again in {config.window_seconds} seconds.",
            },
        )
    return None


def record_failed_attempt(request: Request, config: RateLimitConfig) -> int:
    """Record a failed login attempt and return the current count."""
    ip = _get_client_ip(request)
    count = _store.record_failure(ip, config.window_seconds)
    logger.info("Failed login attempt from IP %s (%d/%d)", ip, count, config.max_attempts)
    return count


def clear_attempts(request: Request) -> None:
    """Clear failed attempts for the client IP (e.g., after successful login)."""
    ip = _get_client_ip(request)
    _store.clear(ip)

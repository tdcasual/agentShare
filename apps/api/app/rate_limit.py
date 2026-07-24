"""Persistent rate limiter for authentication endpoints.

Counts recent failed login attempts recorded in the audit log and blocks
further attempts after exceeding the configured threshold within the time
window. Two complementary limits apply:

- Per identity+IP: stops targeted password guessing against one account.
- Per IP across all accounts: stops credential spraying, where an attacker
  tries only a few passwords per account to stay under the per-identity cap.

Both limits are reset by a successful login from the same IP so shared NAT
gateways are not punished by one user's mistyped password.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import NamedTuple

from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.client_ip import get_client_ip
from app.orm import AuditLog
from app.time_utils import as_utc

logger = logging.getLogger("app.rate_limit")


class RateLimitConfig(NamedTuple):
    max_attempts: int
    window_seconds: int
    ip_max_attempts: int = 20


async def _check_ip_login_rate_limit(
    db: AsyncSession,
    client_ip: str,
    base_cutoff: datetime,
    config: RateLimitConfig,
) -> JSONResponse | None:
    """Block an IP after too many failed logins across all accounts."""
    cutoff = base_cutoff
    last_success = await db.scalar(
        select(func.max(AuditLog.created_at)).where(
            AuditLog.action == "admin.login",
            AuditLog.result == "success",
            AuditLog.ip_address == client_ip,
            AuditLog.created_at >= cutoff,
        )
    )
    if last_success is not None:
        # SQLite returns naive datetimes for DateTime(timezone=True) columns.
        cutoff = max(cutoff, as_utc(last_success))
    failure_count = await db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.action == "admin.login.failed",
            AuditLog.result == "denied",
            AuditLog.ip_address == client_ip,
            AuditLog.created_at >= cutoff,
        )
    )
    if (failure_count or 0) < config.ip_max_attempts:
        return None
    logger.warning(
        "IP login rate limit exceeded for %s: %d failed attempts across accounts in %d seconds",
        client_ip,
        failure_count,
        config.window_seconds,
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Too many failed login attempts. Try again in {config.window_seconds} seconds.",
        },
    )


async def check_persistent_login_rate_limit(
    db: AsyncSession,
    request: Request,
    config: RateLimitConfig,
    identifier: str,
) -> JSONResponse | None:
    normalized_identifier = identifier.strip().lower()
    client_ip = get_client_ip(request)
    cutoff = datetime.now(UTC) - timedelta(seconds=config.window_seconds)

    ip_limited = await _check_ip_login_rate_limit(db, client_ip, cutoff, config)
    if ip_limited is not None:
        return ip_limited

    last_success = await db.scalar(
        select(func.max(AuditLog.created_at)).where(
            AuditLog.action == "admin.login",
            AuditLog.result == "success",
            AuditLog.actor_label == normalized_identifier,
            AuditLog.ip_address == client_ip,
            AuditLog.created_at >= cutoff,
        )
    )
    if last_success is not None:
        # SQLite returns naive datetimes for DateTime(timezone=True) columns.
        cutoff = max(cutoff, as_utc(last_success))
    attempt_count = await db.scalar(
        select(func.count(AuditLog.id)).where(
            AuditLog.action == "admin.login.failed",
            AuditLog.result == "denied",
            AuditLog.actor_label == normalized_identifier,
            AuditLog.ip_address == client_ip,
            AuditLog.created_at >= cutoff,
        )
    )
    if (attempt_count or 0) < config.max_attempts:
        return None
    logger.warning(
        "Persistent login rate limit exceeded for IP %s: %d attempts in %d seconds",
        client_ip,
        attempt_count,
        config.window_seconds,
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Too many failed login attempts. Try again in {config.window_seconds} seconds.",
        },
    )

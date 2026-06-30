"""VaultGate authentication dependencies.

This module provides shared dependency injection functions for authentication.
Session cookies use HMAC-signed tokens with a per-session random nonce
to prevent session fixation attacks.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.orm.token import Token
from app.orm.user import User
from app.runtime import AppRuntime

RUNTIME_MISSING_MESSAGE = (
    "App runtime is not attached to FastAPI state. Build the application through create_app()."
)


def get_attached_runtime(request: Request) -> AppRuntime:
    runtime: AppRuntime = getattr(request.app.state, "runtime", None)  # type: ignore[assignment]
    if runtime is None:
        raise RuntimeError(RUNTIME_MISSING_MESSAGE)
    return runtime


# ---------------------------------------------------------------------------
# HMAC-signed session cookie helpers
# ---------------------------------------------------------------------------

def _sign_session_value(user_id: str, secret: str) -> str:
    """Create HMAC-SHA256 signature for a session cookie value.

    Includes a per-session random nonce to prevent session fixation.
    Returns: ``{user_id}:{nonce}:{hex_hmac}``
    """
    nonce = secrets.token_hex(16)
    mac = hmac.new(
        secret.encode(), f"{user_id}:{nonce}".encode(), hashlib.sha256
    ).hexdigest()
    return f"{user_id}:{nonce}:{mac}"


def _verify_session_value(cookie_value: str, secret: str) -> str | None:
    """Verify HMAC-signed cookie and return the user_id, or None if invalid."""
    parts = cookie_value.split(":")
    if len(parts) != 3:
        return None
    user_id, nonce, mac = parts
    expected = hmac.new(
        secret.encode(), f"{user_id}:{nonce}".encode(), hashlib.sha256
    ).hexdigest()
    if hmac.compare_digest(mac, expected):
        return user_id
    return None


def get_session_user_id(request: Request, secret: str, cookie_name: str = "user_id") -> str | None:
    """Extract and verify user_id from the HMAC-signed session cookie.

    Returns the verified user_id, or None if missing/invalid.
    """
    raw = request.cookies.get(cookie_name)
    if not raw:
        return None
    return _verify_session_value(raw, secret)


def sign_session_cookie(user_id: str, secret: str) -> str:
    """Public API for signing a session cookie value (used by login route)."""
    return _sign_session_value(user_id, secret)


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------

async def get_current_user_from_session(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> User:
    """Get the current authenticated user from the HMAC-signed session cookie."""
    runtime = get_attached_runtime(request)
    user_id = get_session_user_id(
        request,
        runtime.settings.session_secret,
        runtime.settings.session_cookie_name,
    )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    return user


async def get_token_from_bearer(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> Token:
    """Extract and validate Bearer token from request."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token_value = auth_header[7:]  # Remove "Bearer " prefix

    # Validate token format
    if not token_value.startswith("vg_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )

    # Hash the token and look it up
    token_hash = hashlib.sha256(token_value.encode()).hexdigest()

    result = await db.execute(
        select(Token).where(Token.key_hash == token_hash)
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    # Check token status and expiration
    if not token.is_valid():
        if token.is_expired():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
            )
        # Any other invalid state is a revoked token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    return token

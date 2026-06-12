"""VaultGate session routes.

This module provides API endpoints for user authentication (login/logout).
"""
from __future__ import annotations

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_async_db
from app.dependencies import get_attached_runtime, get_current_user_from_session, sign_session_cookie
from app.orm.user import User
from app.rate_limit import RateLimitConfig, check_rate_limit, clear_attempts, record_failed_attempt

router = APIRouter(prefix="/api/session")


class LoginRequest(BaseModel):
    """Schema for login request body."""

    email: str = Field(..., min_length=1, description="User email address")
    password: str = Field(..., min_length=1, description="User password")


@router.post(
    "/login",
    tags=["Authentication"],
    summary="User login",
    description="Authenticate with email and password to receive a session cookie.",
)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Login with email and password."""
    settings = get_attached_runtime(request).settings

    # Rate limit check
    rate_config = RateLimitConfig(
        max_attempts=settings.auth_rate_limit_max_attempts,
        window_seconds=settings.auth_rate_limit_window_seconds,
    )
    rate_limit_response = check_rate_limit(request, rate_config)
    if rate_limit_response is not None:
        return rate_limit_response

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == body.email)
    )
    user = result.scalar_one_or_none()

    if not user:
        record_failed_attempt(request, rate_config)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Verify password using bcrypt
    try:
        if not bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
            record_failed_attempt(request, rate_config)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
    except (ValueError, TypeError):
        record_failed_attempt(request, rate_config)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Clear failed attempts on successful login
    clear_attempts(request)

    # Set HMAC-signed session cookie
    signed_value = sign_session_cookie(user.id, settings.session_secret)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=signed_value,
        httponly=True,
        secure=settings.session_secure,
        samesite="lax",
        max_age=settings.session_ttl_seconds,
        path="/",
    )

    return {
        "status": "authenticated",
        "user_id": user.id,
        "email": user.email,
    }


@router.post(
    "/logout",
    tags=["Authentication"],
    summary="User logout",
    description="Clear the session cookie.",
)
async def logout(
    request: Request,
    response: Response,
) -> dict:
    """Logout and clear session."""
    settings = get_attached_runtime(request).settings
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
    )

    return {"status": "logged_out"}


@router.get(
    "/me",
    tags=["Authentication"],
    summary="Get current user",
    description="Get information about the currently authenticated user.",
)
async def get_me(
    user: User = Depends(get_current_user_from_session),
) -> dict:
    """Get current user information."""
    return {
        "user_id": user.id,
        "email": user.email,
        "role": "admin",
        "created_at": user.created_at.isoformat(),
    }

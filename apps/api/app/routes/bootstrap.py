"""VaultGate bootstrap routes.

This module provides the bootstrap endpoint for creating the initial user.
"""
from __future__ import annotations

import bcrypt
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_async_db
from app.orm.user import User


def validate_password_strength(password: str) -> None:
    """Validate password meets minimum security requirements.

    Requirements:
    - At least 12 characters long
    - Contains at least one lowercase letter
    - Contains at least one uppercase letter
    - Contains at least one digit
    - Contains at least one special character
    """
    if len(password) < 12:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 12 characters long",
        )

    if not re.search(r'[a-z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter",
        )

    if not re.search(r'[A-Z]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter",
        )

    if not re.search(r'\d', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one digit",
        )

    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>/?]', password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character",
        )


class BootstrapRequest(BaseModel):
    """Schema for bootstrap initialization request body."""

    email: str = Field(..., min_length=3, max_length=255, description="Admin email address")
    password: str = Field(..., min_length=12, description="Admin password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        """Basic email format validation."""
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v.lower().strip()


router = APIRouter(prefix="/api/bootstrap")


@router.post(
    "/init",
    tags=["Bootstrap"],
    summary="Initialize VaultGate",
    description="Create the initial user account. Only works if no users exist.",
)
async def bootstrap_init(
    body: BootstrapRequest,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Create the initial user account.

    This endpoint only works if there are no existing users.
    Use this to bootstrap VaultGate with the first admin account.

    Password requirements:
    - At least 12 characters
    - At least one lowercase letter
    - At least one uppercase letter
    - At least one digit
    - At least one special character
    """
    # Validate password strength
    validate_password_strength(body.password)
    # Check if any users exist
    result = await db.execute(select(User).limit(1))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="VaultGate is already initialized. Use /api/session/login to log in.",
        )

    # Create the first user with bcrypt password hash
    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    user = User(
        id=str(uuid.uuid4()),
        email=body.email,
        password_hash=password_hash,
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "message": "VaultGate initialized successfully",
        "user_id": user.id,
        "email": user.email,
        "next_step": "Use /api/session/login to log in with your credentials.",
    }

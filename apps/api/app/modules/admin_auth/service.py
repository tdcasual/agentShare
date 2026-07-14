from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

import bcrypt
from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.orm import AdminSession, ManagementToken, User


@dataclass(frozen=True)
class AdminPrincipal:
    user: User
    auth_type: Literal["session", "management_token"]
    credential_id: str


def hash_credential(raw_value: str) -> str:
    return hashlib.sha256(raw_value.encode()).hexdigest()


def generate_credential(prefix: str) -> tuple[str, str, str]:
    raw_value = prefix + secrets.token_urlsafe(48)
    return raw_value, hash_credential(raw_value), raw_value[:16]


def expires_from_ttl(ttl_seconds: int | None) -> datetime | None:
    if ttl_seconds is None:
        return None
    return datetime.now(UTC) + timedelta(seconds=ttl_seconds)


async def authenticate_password(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.strip().lower()))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    try:
        return user if bcrypt.checkpw(password.encode(), user.password_hash.encode()) else None
    except (TypeError, ValueError):
        return None


async def resolve_admin_principal(request: Request, db: AsyncSession) -> AdminPrincipal:
    authorization = request.headers.get("authorization")
    if authorization:
        if not authorization.startswith("Bearer "):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authorization")
        raw_value = authorization.removeprefix("Bearer ")
        if not raw_value.startswith("vgm_"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid management token")
        result = await db.execute(
            select(ManagementToken).where(ManagementToken.key_hash == hash_credential(raw_value))
        )
        token = result.scalar_one_or_none()
        if token is None or not token.is_valid():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid management token")
        user = await db.get(User, token.user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid management token")
        token.last_used_at = datetime.now(UTC)
        await db.commit()
        return AdminPrincipal(user=user, auth_type="management_token", credential_id=token.id)

    settings = request.app.state.settings
    raw_session = request.cookies.get(settings.session_cookie_name)
    if not raw_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    result = await db.execute(
        select(AdminSession).where(AdminSession.key_hash == hash_credential(raw_session))
    )
    session = result.scalar_one_or_none()
    if session is None or not session.is_valid():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = await db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    session.last_used_at = datetime.now(UTC)
    await db.commit()
    return AdminPrincipal(user=user, auth_type="session", credential_id=session.id)

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.admin_auth.schemas import BootstrapRequest, LoginRequest, ManagementTokenCreate
from app.modules.admin_auth.service import (
    AdminPrincipal,
    authenticate_password,
    expires_from_ttl,
    generate_credential,
    resolve_admin_principal,
)
from app.orm import AdminSession, ManagementToken, User
from app.rate_limit import RateLimitConfig, check_rate_limit, clear_attempts, record_failed_attempt

router = APIRouter(prefix="/api/admin", tags=["Admin"])


async def get_admin_principal(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> AdminPrincipal:
    return await resolve_admin_principal(request, db)


@router.get("/bootstrap/status")
async def bootstrap_status(db: AsyncSession = Depends(get_async_db)) -> dict[str, bool]:
    count = await db.scalar(select(func.count(User.id)))
    return {"setup_required": not bool(count)}


@router.post("/bootstrap/init", status_code=status.HTTP_201_CREATED)
async def bootstrap_init(
    body: BootstrapRequest,
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    user = User(
        email=body.email,
        password_hash=bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode(),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="VaultGate is already initialized") from exc
    await db.refresh(user)
    return {"id": user.id, "email": user.email}


@router.post("/session/login")
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    settings = request.app.state.settings
    rate_config = RateLimitConfig(
        settings.auth_rate_limit_max_attempts,
        settings.auth_rate_limit_window_seconds,
    )
    limited = check_rate_limit(request, rate_config, body.email)
    if limited is not None:
        return limited  # type: ignore[return-value]
    user = await authenticate_password(db, body.email, body.password)
    if user is None:
        record_failed_attempt(request, rate_config, body.email)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    clear_attempts(request, body.email)
    raw_value, key_hash, key_prefix = generate_credential("vgs_")
    session = AdminSession(
        user_id=user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.session_ttl_seconds),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    await db.commit()
    response.set_cookie(
        settings.session_cookie_name,
        raw_value,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.session_secure,
        samesite="lax",
        path="/",
    )
    return {"email": user.email, "status": "authenticated"}


@router.get("/session")
async def current_session(
    principal: AdminPrincipal = Depends(get_admin_principal),
) -> dict[str, str]:
    return {
        "id": principal.user.id,
        "email": principal.user.email,
        "auth_type": principal.auth_type,
    }


@router.delete("/session", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    if principal.auth_type != "session":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session authentication required")
    session = await db.get(AdminSession, principal.credential_id)
    if session is not None:
        session.revoked_at = datetime.now(UTC)
        await db.commit()
    response.delete_cookie(request.app.state.settings.session_cookie_name, path="/")


@router.get("/management-tokens")
async def list_management_tokens(
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, list[dict[str, str | None]]]:
    rows = await db.scalars(
        select(ManagementToken)
        .where(ManagementToken.user_id == principal.user.id)
        .order_by(ManagementToken.created_at.desc(), ManagementToken.id)
    )
    return {"items": [
        {
            "id": item.id,
            "name": item.name,
            "key_prefix": item.key_prefix,
            "revoked_at": item.revoked_at.isoformat() if item.revoked_at else None,
        }
        for item in rows
    ]}


@router.post("/management-tokens", status_code=status.HTTP_201_CREATED)
async def create_management_token(
    body: ManagementTokenCreate,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str | None]:
    raw_value, key_hash, key_prefix = generate_credential("vgm_")
    token = ManagementToken(
        user_id=principal.user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=body.name,
        description=body.description,
        expires_at=expires_from_ttl(body.ttl_seconds),
    )
    db.add(token)
    await db.commit()
    await db.refresh(token)
    response.headers["Cache-Control"] = "no-store"
    return {"id": token.id, "name": token.name, "token": raw_value, "key_prefix": token.key_prefix}


@router.delete("/management-tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_management_token(
    token_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    token = await db.get(ManagementToken, token_id)
    if token is None or token.user_id != principal.user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Management token not found")
    token.revoked_at = datetime.now(UTC)
    await db.commit()


@router.post("/management-tokens/{token_id}/rotate")
async def rotate_management_token(
    token_id: str,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    token = await db.get(ManagementToken, token_id)
    if token is None or token.user_id != principal.user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Management token not found")
    raw_value, token.key_hash, token.key_prefix = generate_credential("vgm_")
    token.revoked_at = None
    await db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {"id": token.id, "name": token.name, "token": raw_value, "key_prefix": token.key_prefix}

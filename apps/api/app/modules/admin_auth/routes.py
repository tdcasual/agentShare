from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api_schemas import (
    AdminSessionResponse,
    AdminUserResponse,
    BootstrapStatusResponse,
    LoginResponse,
    ManagementTokenIssued,
    ManagementTokenPageResponse,
)
from app.client_ip import get_client_ip
from app.db import get_async_db
from app.idempotency import commit_idempotent_response, replay_idempotent_response
from app.modules.admin_auth.schemas import BootstrapRequest, LoginRequest, ManagementTokenCreate
from app.modules.admin_auth.service import (
    AdminPrincipal,
    authenticate_password,
    expires_from_ttl,
    generate_credential,
    get_admin_principal,
    renew_expiration,
)
from app.modules.audit.service import add_admin_audit, write_auth_failure_audit
from app.orm import AdminSession, ManagementToken, User
from app.rate_limit import RateLimitConfig, check_persistent_login_rate_limit

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/bootstrap/status", response_model=BootstrapStatusResponse)
async def bootstrap_status(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, bool]:
    count = await db.scalar(select(func.count(User.id)))
    setup_required = not bool(count)
    return {
        "setup_required": setup_required,
        "bootstrap_token_required": setup_required and request.app.state.settings.is_production_like(),
    }


@router.post("/bootstrap/init", status_code=status.HTTP_201_CREATED, response_model=AdminUserResponse)
async def bootstrap_init(
    body: BootstrapRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    settings = request.app.state.settings
    if settings.is_production_like():
        supplied_token = request.headers.get("x-bootstrap-token", "")
        if not secrets.compare_digest(supplied_token, settings.bootstrap_token):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap token")
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


@router.post("/session/login", response_model=LoginResponse)
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
    limited = await check_persistent_login_rate_limit(db, request, rate_config, body.email)
    if limited is not None:
        await write_auth_failure_audit(
            db,
            request,
            action="admin.login.failed",
            actor_type="anonymous",
            actor_label=body.email,
            reason="rate_limited",
        )
        return limited  # type: ignore[return-value]
    user = await authenticate_password(db, body.email, body.password)
    if user is None:
        await write_auth_failure_audit(
            db,
            request,
            action="admin.login.failed",
            actor_type="anonymous",
            actor_label=body.email,
            reason="invalid_credentials",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    raw_value, key_hash, key_prefix = generate_credential("vgs_")
    session = AdminSession(
        user_id=user.id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        expires_at=datetime.now(UTC) + timedelta(seconds=settings.session_ttl_seconds),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(session)
    await db.flush()
    principal = AdminPrincipal(user=user, auth_type="session", credential_id=session.id)
    add_admin_audit(
        db,
        request,
        principal,
        action="admin.login",
        resource_type="admin_session",
        resource_id=session.id,
        resource_label=user.email,
    )
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


@router.get("/session", response_model=AdminSessionResponse)
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
        add_admin_audit(
            db,
            request,
            principal,
            action="admin.logout",
            resource_type="admin_session",
            resource_id=session.id,
            resource_label=principal.user.email,
        )
        await db.commit()
    response.delete_cookie(request.app.state.settings.session_cookie_name, path="/")


@router.get("/management-tokens", response_model=ManagementTokenPageResponse)
async def list_management_tokens(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    total = await db.scalar(
        select(func.count(ManagementToken.id)).where(
            ManagementToken.user_id == principal.user.id
        )
    )
    rows = await db.scalars(
        select(ManagementToken)
        .where(ManagementToken.user_id == principal.user.id)
        .order_by(ManagementToken.created_at.desc(), ManagementToken.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "key_prefix": item.key_prefix,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
                "revoked_at": item.revoked_at.isoformat() if item.revoked_at else None,
                "last_used_at": item.last_used_at.isoformat() if item.last_used_at else None,
                "created_at": item.created_at.isoformat(),
            }
            for item in rows
        ],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }


@router.post(
    "/management-tokens",
    status_code=status.HTTP_201_CREATED,
    response_model=ManagementTokenIssued,
)
async def create_management_token(
    body: ManagementTokenCreate,
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str | None]:
    idempotency, replay = await replay_idempotent_response(
        db, request, principal.user.id, body.model_dump(mode="json")
    )
    if replay is not None:
        response.headers["Cache-Control"] = "no-store"
        return replay
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
    await db.flush()
    add_admin_audit(
        db,
        request,
        principal,
        action="management_token.create",
        resource_type="management_token",
        resource_id=token.id,
        resource_label=token.name,
    )
    payload = {
        "id": token.id,
        "name": token.name,
        "token": raw_value,
        "key_prefix": token.key_prefix,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
    }
    concurrent_replay = await commit_idempotent_response(
        db, principal.user.id, idempotency, payload, status_code=201
    )
    if concurrent_replay is not None:
        response.headers["Cache-Control"] = "no-store"
        return concurrent_replay
    await db.refresh(token)
    response.headers["Cache-Control"] = "no-store"
    return payload


@router.delete("/management-tokens/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_management_token(
    token_id: str,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    token = await db.get(ManagementToken, token_id)
    if token is None or token.user_id != principal.user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Management token not found")
    token.revoked_at = datetime.now(UTC)
    add_admin_audit(
        db,
        request,
        principal,
        action="management_token.revoke",
        resource_type="management_token",
        resource_id=token.id,
        resource_label=token.name,
    )
    await db.commit()


@router.post("/management-tokens/{token_id}/rotate", response_model=ManagementTokenIssued)
async def rotate_management_token(
    token_id: str,
    request: Request,
    response: Response,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str | None]:
    token = await db.get(ManagementToken, token_id)
    if token is None or token.user_id != principal.user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Management token not found")
    raw_value, token.key_hash, token.key_prefix = generate_credential("vgm_")
    token.expires_at = renew_expiration(token.created_at, token.expires_at)
    token.revoked_at = None
    add_admin_audit(
        db,
        request,
        principal,
        action="management_token.rotate",
        resource_type="management_token",
        resource_id=token.id,
        resource_label=token.name,
    )
    await db.commit()
    response.headers["Cache-Control"] = "no-store"
    return {
        "id": token.id,
        "name": token.name,
        "token": raw_value,
        "key_prefix": token.key_prefix,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
    }

import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, management_security, require_management_session
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.errors import AuthorizationError, ConflictError
from app.observability import record_management_session_login, record_management_session_logout
from app.schemas.sessions import ManagementLoginRequest, ManagementLogoutResponse, ManagementSessionResponse
from app.services.audit_service import write_audit_event
from app.services.auth_rate_limit import (
    AuthRateLimitExceeded,
    build_auth_rate_limit_key,
    clear_auth_failures,
    ensure_auth_attempt_allowed,
    record_auth_failure,
)
from app.services.session_service import (
    authenticate_management_operator,
    create_management_session,
    decode_management_session_token,
    issue_management_session_token,
    revoke_management_session,
)

router = APIRouter(prefix="/api/session")


def _check_csrf_origin(request: Request, settings: Settings) -> None:
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    if not origin and not referer:
        if settings.is_production_like():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Origin or Referer header required",
            )
        return
    source = origin or referer
    allowed = settings.csrf_allowed_origins
    if allowed and source:
        permitted = {o.strip() for o in allowed.split(",") if o.strip()}
        if not any(source.startswith(p) for p in permitted):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Request origin not allowed",
            )


@router.post(
    "/login",
    response_model=ManagementSessionResponse,
    tags=["Bootstrap"],
    summary="Log in to the management console",
    description="Exchange persisted human account credentials for a short-lived management session cookie.",
)
def login_management_session(
    payload: ManagementLoginRequest,
    request: Request,
    response: Response,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    _check_csrf_origin(request, settings)
    rate_limit_key = build_auth_rate_limit_key(
        bucket="management-login",
        client_host=request.client.host if request.client else None,
        subject=payload.email,
    )
    try:
        ensure_auth_attempt_allowed(settings, rate_limit_key)
    except AuthRateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Try again later.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    try:
        account = authenticate_management_operator(
            session,
            settings,
            email=payload.email,
            password=payload.password,
        )
    except (AuthorizationError, ConflictError) as exc:
        record_management_session_login(False)
        write_audit_event(session, "management_session_rejected", {
            "actor_type": "human",
            "actor_id": payload.email,
            "reason": str(exc),
        })
        detail = str(exc)
        if detail == "Bootstrap setup is required before management login":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc
        record_auth_failure(settings, rate_limit_key)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail) from exc

    session_payload = create_management_session(session, settings, account)
    token = issue_management_session_token(settings, payload=session_payload)
    clear_auth_failures(rate_limit_key)
    record_management_session_login(True)
    response.set_cookie(
        key=settings.management_session_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.management_session_secure,
        max_age=settings.management_session_ttl_seconds,
        path="/",
    )
    write_audit_event(session, "management_session_started", {
        "actor_type": "human",
        "actor_id": session_payload.actor_id,
        "session_id": session_payload.session_id,
    })
    return {
        "status": "authenticated",
        "actor_type": session_payload.actor_type,
        "actor_id": session_payload.actor_id,
        "role": session_payload.role,
        "auth_method": session_payload.auth_method,
        "session_id": session_payload.session_id,
        "email": session_payload.email,
        "expires_in": _remaining_expires_in(session_payload.exp),
        "issued_at": session_payload.iat,
        "expires_at": session_payload.exp,
    }


@router.post(
    "/logout",
    response_model=ManagementLogoutResponse,
    tags=["Management"],
    summary="Log out of the management console",
    description="Clear the current management session cookie.",
)
def logout_management_session(
    request: Request,
    response: Response,
    _documented_session_token: str | None = Depends(management_security),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    del _documented_session_token
    session_token = request.cookies.get(settings.management_session_cookie_name)
    if session_token:
        try:
            payload = decode_management_session_token(session_token, settings)
            revoke_management_session(session, payload.session_id)
            record_management_session_logout()
            write_audit_event(session, "management_session_ended", {
                "actor_type": payload.actor_type,
                "actor_id": payload.actor_id,
                "session_id": payload.session_id,
            })
        except ValueError:
            pass
    response.delete_cookie(
        key=settings.management_session_cookie_name,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.management_session_secure,
    )
    return {"status": "logged_out"}


@router.get(
    "/me",
    response_model=ManagementSessionResponse,
    tags=["Management"],
    summary="Inspect the current management session",
    description="Return the normalized human management identity carried by the session cookie.",
)
def get_management_session(
    identity: ManagementIdentity = Depends(require_management_session),
) -> dict:
    return {
        "status": "authenticated",
        "actor_type": identity.actor_type,
        "actor_id": identity.id,
        "role": identity.role,
        "auth_method": identity.auth_method,
        "session_id": identity.session_id,
        "email": identity.email,
        "expires_in": _remaining_expires_in(identity.expires_at),
        "issued_at": identity.issued_at,
        "expires_at": identity.expires_at,
    }


def _remaining_expires_in(expires_at: int) -> int:
    return max(0, expires_at - int(time.time()))

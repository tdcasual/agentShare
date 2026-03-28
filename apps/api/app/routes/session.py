from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.observability import record_management_session_login
from app.schemas.sessions import ManagementLoginRequest, ManagementSessionResponse
from app.services.audit_service import write_audit_event
from app.services.session_service import (
    authenticate_bootstrap_key,
    build_management_session_payload,
    decode_management_session_token,
    issue_management_session_token,
)

router = APIRouter(prefix="/api/session")


@router.post(
    "/login",
    response_model=ManagementSessionResponse,
    tags=["Bootstrap"],
    summary="Log in to the management console",
    description="Exchange the bootstrap management credential for a short-lived human management session cookie.",
)
def login_management_session(
    payload: ManagementLoginRequest,
    response: Response,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    if not authenticate_bootstrap_key(session, payload.bootstrap_key):
        record_management_session_login(False)
        write_audit_event(session, "management_session_rejected", {
            "actor_type": "human",
            "actor_id": settings.management_operator_id,
            "reason": "invalid_bootstrap_credential",
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap management credential",
        )

    payload = build_management_session_payload(settings)
    token = issue_management_session_token(settings, payload=payload)
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
        "actor_id": payload.actor_id,
        "session_id": payload.session_id,
    })
    return {
        "status": "authenticated",
        "actor_type": payload.actor_type,
        "actor_id": payload.actor_id,
        "role": payload.role,
        "auth_method": payload.auth_method,
        "session_id": payload.session_id,
        "expires_in": settings.management_session_ttl_seconds,
        "issued_at": payload.iat,
        "expires_at": payload.exp,
    }


@router.post(
    "/logout",
    tags=["Management"],
    summary="Log out of the management console",
    description="Clear the current management session cookie.",
)
def logout_management_session(
    request: Request,
    response: Response,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    session_token = request.cookies.get(settings.management_session_cookie_name)
    if session_token:
        try:
            payload = decode_management_session_token(session_token, settings)
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
    settings: Settings = Depends(get_settings),
) -> dict:
    return {
        "status": "authenticated",
        "actor_type": identity.actor_type,
        "actor_id": identity.id,
        "role": identity.role,
        "auth_method": identity.auth_method,
        "session_id": identity.session_id,
        "expires_in": settings.management_session_ttl_seconds,
        "issued_at": identity.issued_at,
        "expires_at": identity.expires_at,
    }

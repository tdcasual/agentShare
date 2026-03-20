from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.config import Settings
from app.db import get_db
from app.schemas.sessions import ManagementLoginRequest, ManagementSessionResponse
from app.services.audit_service import write_audit_event
from app.services.session_service import (
    authenticate_bootstrap_key,
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
) -> dict:
    if not authenticate_bootstrap_key(session, payload.bootstrap_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap management credential",
        )

    settings = Settings()
    token = issue_management_session_token(settings)
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
        "actor_id": "management",
    })
    return {
        "status": "authenticated",
        "actor_type": "human",
        "actor_id": "management",
        "role": "admin",
        "expires_in": settings.management_session_ttl_seconds,
    }


@router.post(
    "/logout",
    tags=["Management"],
    summary="Log out of the management console",
    description="Clear the current management session cookie.",
)
def logout_management_session(response: Response) -> dict:
    settings = Settings()
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
    settings = Settings()
    return {
        "status": "authenticated",
        "actor_type": identity.actor_type,
        "actor_id": identity.id,
        "role": identity.role,
        "expires_in": settings.management_session_ttl_seconds,
    }

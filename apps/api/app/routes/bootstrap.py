from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.dependencies import get_settings
from app.config import Settings
from app.schemas.bootstrap import (
    BootstrapOwnerSetupRequest,
    BootstrapOwnerSetupResponse,
    BootstrapStatusResponse,
)
from app.services.audit_service import write_audit_event
from app.services.auth_rate_limit import (
    AuthRateLimitExceeded,
    build_auth_rate_limit_key,
    clear_auth_failures,
    ensure_auth_attempt_allowed,
    record_auth_failure,
)
from app.services.bootstrap_service import create_first_owner, is_bootstrap_initialized
from app.services.session_service import authenticate_bootstrap_key

router = APIRouter(prefix="/api/bootstrap")


@router.get(
    "/status",
    response_model=BootstrapStatusResponse,
    tags=["Bootstrap"],
    summary="Inspect first-run bootstrap state",
    description="Return whether the control plane has already been initialized with its first owner account.",
)
def bootstrap_status(
    session: Session = Depends(get_db),
) -> dict:
    return {"initialized": is_bootstrap_initialized(session)}


@router.post(
    "/setup-owner",
    response_model=BootstrapOwnerSetupResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Bootstrap"],
    summary="Create the first owner account",
    description="Use the bootstrap credential once to create the first owner account, then mark the system initialized.",
)
def setup_owner(
    payload: BootstrapOwnerSetupRequest,
    request: Request,
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    rate_limit_key = build_auth_rate_limit_key(
        bucket="bootstrap-owner",
        client_host=request.client.host if request.client else None,
        subject="setup-owner",
    )
    try:
        ensure_auth_attempt_allowed(settings, rate_limit_key)
    except AuthRateLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed bootstrap attempts. Try again later.",
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc

    if not authenticate_bootstrap_key(settings, payload.bootstrap_key):
        record_auth_failure(settings, rate_limit_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid bootstrap credential",
        )

    account = create_first_owner(
        session,
        email=payload.email,
        display_name=payload.display_name,
        password=payload.password,
    )
    clear_auth_failures(rate_limit_key)
    write_audit_event(session, "owner_bootstrapped", {
        "actor_type": "bootstrap",
        "actor_id": "bootstrap",
        "account_id": account.id,
        "email": account.email,
    })
    session.commit()
    return {
        "initialized": True,
        "account": {
            "id": account.id,
            "email": account.email,
            "display_name": account.display_name,
            "role": account.role,
            "status": account.status,
        },
    }

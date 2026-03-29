from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_admin_management_session
from app.db import get_db
from app.schemas.admin_accounts import (
    AdminAccountCreate,
    AdminAccountDisableResponse,
    AdminAccountListResponse,
    AdminAccountResponse,
)
from app.services.admin_account_service import (
    create_admin_account,
    disable_admin_account,
    list_admin_accounts,
)
from app.services.audit_service import write_audit_event

router = APIRouter(prefix="/api/admin-accounts")


@router.get(
    "",
    response_model=AdminAccountListResponse,
    tags=["Management"],
    summary="List invited management accounts",
    description="Return persisted human management accounts. Requires an admin-or-higher management role.",
)
def list_accounts(
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    accounts = list_admin_accounts(session)
    write_audit_event(session, "admin_accounts_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(accounts),
    })
    return {"items": [_to_response(account) for account in accounts]}


@router.post(
    "",
    response_model=AdminAccountResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Invite a management account",
    description="Create a persisted viewer, operator, or admin account. Requires an admin-or-higher management role.",
)
def create_account(
    payload: AdminAccountCreate,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    account = create_admin_account(
        session,
        email=payload.email,
        display_name=payload.display_name,
        password=payload.password,
        role=payload.role,
    )
    write_audit_event(session, "admin_account_created", {
        "account_id": account.id,
        "role": account.role,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return _to_response(account)


@router.post(
    "/{account_id}/disable",
    response_model=AdminAccountDisableResponse,
    tags=["Management"],
    summary="Disable a management account",
    description="Soft-disable a non-owner human management account. Requires an admin-or-higher management role.",
)
def disable_account(
    account_id: str,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    account = disable_admin_account(session, account_id=account_id)
    write_audit_event(session, "admin_account_disabled", {
        "account_id": account.id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return {"id": account.id, "status": account.status}


def _to_response(account) -> dict:
    return {
        "id": account.id,
        "email": account.email,
        "display_name": account.display_name,
        "role": account.role,
        "status": account.status,
        "last_login_at": account.last_login_at,
    }

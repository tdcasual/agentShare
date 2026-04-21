from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.schemas.access_tokens import (
    AccessTokenCreate,
    AccessTokenListResponse,
    AccessTokenResponse,
    AccessTokenRevokeResponse,
)
from app.services.access_token_service import (
    list_access_tokens,
    mint_access_token,
    revoke_access_token,
    serialize_access_token,
)
from app.services.audit_service import write_audit_event

router = APIRouter(prefix="/api/access-tokens")


@router.get(
    "",
    response_model=AccessTokenListResponse,
    tags=["Management"],
    summary="List standalone access tokens",
    description="Return all managed standalone access tokens.",
)
def list_access_tokens_route(
    manager: ManagementIdentity = Depends(require_management_action("tokens:list")),
    session: Session = Depends(get_db),
) -> dict:
    items = list_access_tokens(session)
    write_audit_event(session, "access_tokens_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
    })
    return {"items": [serialize_access_token(item) for item in items]}


@router.post(
    "",
    response_model=AccessTokenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Issue a standalone access token",
    description="Create a standalone access token for remote runtime callers.",
)
def create_access_token_route(
    payload: AccessTokenCreate,
    manager: ManagementIdentity = Depends(require_management_action("tokens:issue")),
    session: Session = Depends(get_db),
) -> dict:
    token, raw_token = mint_access_token(
        session,
        subject_type=payload.subject_type,
        subject_id=payload.subject_id,
        display_name=payload.display_name,
        issued_by_actor_type=manager.actor_type,
        issued_by_actor_id=manager.id,
        scopes=payload.scopes,
        labels=payload.labels,
        policy=payload.policy,
        expires_at=payload.expires_at,
    )
    write_audit_event(session, "access_token_created", {
        "token_id": token.id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return serialize_access_token(token, api_key=raw_token)


@router.post(
    "/{token_id}/revoke",
    response_model=AccessTokenRevokeResponse,
    tags=["Management"],
    summary="Revoke a standalone access token",
    description="Revoke a standalone access token without deleting its audit history.",
)
def revoke_access_token_route(
    token_id: str,
    manager: ManagementIdentity = Depends(require_management_action("tokens:revoke")),
    session: Session = Depends(get_db),
) -> dict:
    token = revoke_access_token(session, token_id)
    write_audit_event(session, "access_token_revoked", {
        "token_id": token.id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return {"id": token.id, "status": token.status}

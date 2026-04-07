from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.schemas.agent_tokens import (
    AgentTokenCreate,
    AgentTokenListResponse,
    AgentTokenResponse,
    AgentTokenRevokeResponse,
)
from app.services.agent_token_service import (
    list_agent_tokens,
    mint_agent_token,
    revoke_agent_token,
    serialize_agent_token,
)
from app.services.audit_service import write_audit_event

router = APIRouter()


@router.get(
    "/api/agents/{agent_id}/tokens",
    response_model=AgentTokenListResponse,
    tags=["Management"],
    summary="List remote-access tokens",
    description="Return all managed remote-access tokens attached to an external agent identity.",
)
def list_agent_tokens_route(
    agent_id: str,
    manager: ManagementIdentity = Depends(require_management_action("tokens:list")),
    session: Session = Depends(get_db),
) -> dict:
    items = list_agent_tokens(session, agent_id)
    write_audit_event(session, "agent_tokens_listed", {
        "agent_id": agent_id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
    })
    return {"items": [serialize_agent_token(item) for item in items]}


@router.post(
    "/api/agents/{agent_id}/tokens",
    response_model=AgentTokenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Mint a remote-access token",
    description="Create a new managed remote-access token for the given external agent profile.",
)
def create_agent_token_route(
    agent_id: str,
    payload: AgentTokenCreate,
    manager: ManagementIdentity = Depends(require_management_action("tokens:issue")),
    session: Session = Depends(get_db),
) -> dict:
    token, raw_token = mint_agent_token(
        session,
        agent_id=agent_id,
        display_name=payload.display_name,
        scopes=payload.scopes,
        labels=payload.labels,
        expires_at=payload.expires_at,
        issued_by_actor_type=manager.actor_type,
        issued_by_actor_id=manager.id,
    )
    write_audit_event(session, "agent_token_created", {
        "agent_id": agent_id,
        "token_id": token.id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return serialize_agent_token(token, api_key=raw_token)


@router.post(
    "/api/agent-tokens/{token_id}/revoke",
    response_model=AgentTokenRevokeResponse,
    tags=["Management"],
    summary="Revoke a remote-access token",
    description="Revoke a managed remote-access token without deleting its parent external agent profile.",
)
def revoke_agent_token_route(
    token_id: str,
    manager: ManagementIdentity = Depends(require_management_action("tokens:revoke")),
    session: Session = Depends(get_db),
) -> dict:
    token = revoke_agent_token(session, token_id)
    write_audit_event(session, "agent_token_revoked", {
        "token_id": token.id,
        "agent_id": token.agent_id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return {"id": token.id, "status": token.status}

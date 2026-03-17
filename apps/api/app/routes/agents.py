from __future__ import annotations

import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.db import get_db
from app.models.agent import AgentIdentity
from app.orm.agent import AgentIdentityModel
from app.repositories.agent_repo import AgentRepository
from app.schemas.agents import AgentCreate
from app.services.audit_service import write_audit_event

router = APIRouter(prefix="/api/agents", tags=["agents"])


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.get("/me")
def get_current_agent(agent: AgentIdentity = Depends(require_agent)) -> dict:
    return agent.model_dump()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_agent(
    payload: AgentCreate,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    repo = AgentRepository(session)
    agent_id = f"agent-{len(repo.list_all()) + 1}"
    raw_key = secrets.token_urlsafe(32)
    model = AgentIdentityModel(
        id=agent_id,
        name=payload.name,
        api_key_hash=_hash_key(raw_key),
        status="active",
        allowed_capability_ids=payload.allowed_capability_ids,
        allowed_task_types=payload.allowed_task_types,
        risk_tier=payload.risk_tier,
    )
    repo.create(model)
    write_audit_event(session, "agent_created", {"agent_id": agent_id, "created_by": agent.id})
    return {"id": agent_id, "name": payload.name, "risk_tier": payload.risk_tier, "api_key": raw_key}


@router.get("")
def list_agents(session: Session = Depends(get_db)) -> dict:
    repo = AgentRepository(session)
    agents = repo.list_all()
    return {"items": [
        {"id": a.id, "name": a.name, "status": a.status, "risk_tier": a.risk_tier, "auth_method": a.auth_method}
        for a in agents
    ]}


@router.delete("/{agent_id}")
def delete_agent(
    agent_id: str,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    repo = AgentRepository(session)
    if not repo.delete(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    write_audit_event(session, "agent_deleted", {"agent_id": agent_id, "deleted_by": agent.id})
    return {"status": "deleted", "id": agent_id}

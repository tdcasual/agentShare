from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.admin_auth.routes import get_admin_principal
from app.modules.admin_auth.service import AdminPrincipal
from app.modules.agents.schemas import AgentCreate, AgentUpdate
from app.modules.agents.service import serialize_agent
from app.orm import Agent, AgentStatus, AgentToken

router = APIRouter(prefix="/api/admin/agents", tags=["Admin Agents"])


async def owned_agent(db: AsyncSession, user_id: str, agent_id: str) -> Agent:
    result = await db.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user_id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return agent


@router.get("")
async def list_agents(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    total = await db.scalar(select(func.count(Agent.id)).where(Agent.user_id == principal.user.id))
    agents = await db.scalars(
        select(Agent)
        .where(Agent.user_id == principal.user.id)
        .order_by(Agent.created_at.desc(), Agent.id)
        .limit(limit)
        .offset(offset)
    )
    return {"items": [serialize_agent(agent) for agent in agents], "total": total or 0}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_agent(
    body: AgentCreate,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = Agent(user_id=principal.user.id, name=body.name, description=body.description)
    db.add(agent)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agent name already exists") from exc
    await db.refresh(agent)
    return serialize_agent(agent)


@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = await owned_agent(db, principal.user.id, agent_id)
    tokens = await db.scalars(
        select(AgentToken)
        .where(AgentToken.agent_id == agent.id)
        .order_by(AgentToken.created_at.desc(), AgentToken.id)
    )
    payload = serialize_agent(agent)
    payload["tokens"] = [
        {
            "id": token.id,
            "name": token.name,
            "key_prefix": token.key_prefix,
            "status": token.status,
            "expires_at": token.expires_at.isoformat() if token.expires_at else None,
            "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
        }
        for token in tokens
    ]
    return payload


@router.patch("/{agent_id}")
async def update_agent(
    agent_id: str,
    body: AgentUpdate,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = await owned_agent(db, principal.user.id, agent_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agent name already exists") from exc
    await db.refresh(agent)
    return serialize_agent(agent)


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disable_agent(
    agent_id: str,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> None:
    agent = await owned_agent(db, principal.user.id, agent_id)
    agent.status = AgentStatus.DISABLED
    await db.commit()

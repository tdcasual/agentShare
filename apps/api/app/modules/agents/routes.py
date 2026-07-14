from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
from app.modules.admin_auth.routes import get_admin_principal
from app.modules.admin_auth.service import AdminPrincipal
from app.modules.agents.schemas import AgentCreate, AgentUpdate
from app.modules.agents.service import serialize_agent
from app.modules.audit.service import add_admin_audit
from app.modules.tokens.service import serialize_token
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
    status_filter: str | None = Query(default=None, alias="status"),
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    filters = [Agent.user_id == principal.user.id]
    if status_filter is not None:
        if status_filter not in AgentStatus.all_values():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid Agent status")
        filters.append(Agent.status == status_filter)
    total = await db.scalar(select(func.count(Agent.id)).where(*filters))
    agents = await db.scalars(
        select(Agent)
        .where(*filters)
        .order_by(Agent.created_at.desc(), Agent.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [serialize_agent(agent) for agent in agents],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_agent(
    body: AgentCreate,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = Agent(user_id=principal.user.id, name=body.name, description=body.description)
    db.add(agent)
    try:
        await db.flush()
        add_admin_audit(
            db,
            request,
            principal,
            action="agent.create",
            resource_type="agent",
            resource_id=agent.id,
            resource_label=agent.name,
        )
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
    return serialize_agent(agent)


@router.get("/{agent_id}/tokens")
async def list_agent_tokens(
    agent_id: str,
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = await owned_agent(db, principal.user.id, agent_id)
    total = await db.scalar(
        select(func.count(AgentToken.id)).where(AgentToken.agent_id == agent.id)
    )
    tokens = await db.scalars(
        select(AgentToken)
        .where(AgentToken.agent_id == agent.id)
        .order_by(AgentToken.created_at.desc(), AgentToken.id)
        .limit(limit)
        .offset(offset)
    )
    return {
        "items": [serialize_token(token) for token in tokens],
        "total": total or 0,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/{agent_id}")
async def update_agent(
    agent_id: str,
    body: AgentUpdate,
    request: Request,
    principal: AdminPrincipal = Depends(get_admin_principal),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    agent = await owned_agent(db, principal.user.id, agent_id)
    changes = body.model_dump(exclude_unset=True)
    old_status = agent.status
    for field, value in changes.items():
        setattr(agent, field, value)
    action = "agent.update"
    if agent.status != old_status:
        action = "agent.disable" if agent.status == AgentStatus.DISABLED else "agent.enable"
    try:
        add_admin_audit(
            db,
            request,
            principal,
            action=action,
            resource_type="agent",
            resource_id=agent.id,
            resource_label=agent.name,
        )
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agent name already exists") from exc
    await db.refresh(agent)
    return serialize_agent(agent)

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.errors import NotFoundError
from app.orm.openclaw_agent import OpenClawAgentModel
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.schemas.openclaw_agents import (
    OpenClawAgentCreate,
    OpenClawAgentFileSummary,
    OpenClawAgentFileUpdate,
    OpenClawAgentSummary,
    OpenClawAgentUpdate,
)
from app.services.audit_service import write_audit_event
from app.services.identifiers import new_resource_id

from .openclaw_agent_files import router as openclaw_agent_files_router
from .openclaw_sessions import agent_sessions_router

router = APIRouter(prefix="/api/openclaw/agents")


def _serialize_agent(model: OpenClawAgentModel) -> dict:
    return OpenClawAgentSummary(
        id=model.id,
        name=model.name,
        status=model.status,
        auth_method=model.auth_method,
        risk_tier=model.risk_tier,
        workspace_root=model.workspace_root,
        agent_dir=model.agent_dir,
        model=model.model,
        thinking_level=model.thinking_level,
        sandbox_mode=model.sandbox_mode,
        tools_policy=model.tools_policy or {},
        skills_policy=model.skills_policy or {},
        allowed_capability_ids=model.allowed_capability_ids or [],
        allowed_task_types=model.allowed_task_types or [],
    ).model_dump()


@router.get(
    "",
    tags=["Management"],
    summary="List OpenClaw agents",
    description="Return OpenClaw-native agent workspace and runtime configuration records.",
)
def list_openclaw_agents(
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawAgentRepository(session)
    items = [_serialize_agent(model) for model in repo.list_all()]
    write_audit_event(session, "openclaw_agents_listed", {"actor_id": manager.id, "count": len(items)})
    return {"items": items}


@router.get(
    "/{agent_id}",
    tags=["Management"],
    summary="Get one OpenClaw agent",
    description="Read one OpenClaw-native agent with its runtime defaults and workspace configuration.",
)
def get_openclaw_agent(
    agent_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawAgentRepository(session)
    model = repo.get(agent_id)
    if model is None:
        raise NotFoundError("OpenClaw agent not found")
    write_audit_event(session, "openclaw_agent_read", {"actor_id": manager.id, "agent_id": agent_id})
    return _serialize_agent(model)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create an OpenClaw agent",
    description="Create an OpenClaw-native agent with workspace, policy, and runtime defaults.",
)
def create_openclaw_agent(
    payload: OpenClawAgentCreate,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawAgentRepository(session)
    model = OpenClawAgentModel(
        id=new_resource_id("openclaw-agent"),
        name=payload.name,
        status="active",
        auth_method=payload.auth_method,
        risk_tier=payload.risk_tier,
        workspace_root=payload.workspace_root,
        agent_dir=payload.agent_dir,
        model=payload.model,
        thinking_level=payload.thinking_level,
        sandbox_mode=payload.sandbox_mode,
        tools_policy=payload.tools_policy,
        skills_policy=payload.skills_policy,
        allowed_capability_ids=payload.allowed_capability_ids,
        allowed_task_types=payload.allowed_task_types,
    )
    repo.create(model)
    write_audit_event(session, "openclaw_agent_created", {"actor_id": manager.id, "agent_id": model.id})
    return _serialize_agent(model)


@router.patch(
    "/{agent_id}",
    tags=["Management"],
    summary="Update an OpenClaw agent",
    description="Update the OpenClaw agent runtime defaults, policy, or workspace configuration.",
)
def update_openclaw_agent(
    agent_id: str,
    payload: OpenClawAgentUpdate,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawAgentRepository(session)
    model = repo.get(agent_id)
    if model is None:
        raise NotFoundError("OpenClaw agent not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(model, field, value)
    repo.update(model)
    write_audit_event(session, "openclaw_agent_updated", {"actor_id": manager.id, "agent_id": model.id})
    return _serialize_agent(model)


@router.delete(
    "/{agent_id}",
    tags=["Management"],
    summary="Delete an OpenClaw agent",
    description="Delete an OpenClaw agent configuration record.",
)
def delete_openclaw_agent(
    agent_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:delete")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawAgentRepository(session)
    if not repo.delete(agent_id):
        raise NotFoundError("OpenClaw agent not found")
    write_audit_event(session, "openclaw_agent_deleted", {"actor_id": manager.id, "agent_id": agent_id})
    return {"id": agent_id, "status": "deleted"}


router.include_router(openclaw_agent_files_router)
router.include_router(agent_sessions_router)

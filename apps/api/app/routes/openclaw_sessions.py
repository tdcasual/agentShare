from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.errors import NotFoundError
from app.orm.openclaw_session import OpenClawSessionModel
from app.repositories.openclaw_session_repo import OpenClawSessionRepository
from app.schemas.openclaw_sessions import OpenClawSessionCreate, OpenClawSessionSummary
from app.services.audit_service import write_audit_event
from app.services.identifiers import new_resource_id

router = APIRouter(prefix="/api/openclaw/sessions")
agent_sessions_router = APIRouter()


def _serialize_session(model: OpenClawSessionModel) -> dict:
    return OpenClawSessionSummary(
        id=model.id,
        agent_id=model.agent_id,
        session_key=model.session_key,
        display_name=model.display_name,
        channel=model.channel,
        subject=model.subject,
        transcript_metadata=model.transcript_metadata or {},
        input_tokens=model.input_tokens,
        output_tokens=model.output_tokens,
        context_tokens=model.context_tokens,
        updated_at=model.updated_at,
    ).model_dump()


@agent_sessions_router.post(
    "/{agent_id}/sessions",
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create an OpenClaw session",
    description="Create a management-visible OpenClaw runtime session bound to one agent.",
)
def create_openclaw_session(
    agent_id: str,
    payload: OpenClawSessionCreate,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawSessionRepository(session)
    model = OpenClawSessionModel(
        id=new_resource_id("openclaw-session"),
        agent_id=agent_id,
        session_key=payload.session_key,
        display_name=payload.display_name,
        channel=payload.channel,
        subject=payload.subject,
    )
    repo.create(model)
    write_audit_event(session, "openclaw_session_created", {"actor_id": manager.id, "session_id": model.id, "agent_id": agent_id})
    return _serialize_session(model)


@agent_sessions_router.get(
    "/{agent_id}/sessions",
    tags=["Management"],
    summary="List OpenClaw sessions for one agent",
    description="List OpenClaw runtime sessions that belong to one agent.",
)
def list_openclaw_sessions_for_agent(
    agent_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawSessionRepository(session)
    items = [_serialize_session(model) for model in repo.list_for_agent(agent_id)]
    write_audit_event(
        session,
        "openclaw_agent_sessions_listed",
        {"actor_id": manager.id, "agent_id": agent_id, "count": len(items)},
    )
    return {"items": items}


@router.get(
    "",
    tags=["Management"],
    summary="List OpenClaw sessions",
    description="List OpenClaw runtime sessions across all agents.",
)
def list_openclaw_sessions(
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawSessionRepository(session)
    items = [_serialize_session(model) for model in repo.list_all()]
    write_audit_event(session, "openclaw_sessions_listed", {"actor_id": manager.id, "count": len(items)})
    return {"items": items}


@router.get(
    "/{session_id}",
    tags=["Management"],
    summary="Get one OpenClaw session",
    description="Read one OpenClaw session record by id.",
)
def get_openclaw_session(
    session_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    repo = OpenClawSessionRepository(session)
    model = repo.get(session_id)
    if model is None:
        raise NotFoundError("OpenClaw session not found")
    write_audit_event(session, "openclaw_session_read", {"actor_id": manager.id, "session_id": session_id})
    return _serialize_session(model)

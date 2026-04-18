from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_action
from app.db import get_db
from app.errors import NotFoundError
from app.orm.openclaw_agent_file import OpenClawAgentFileModel
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.repositories.openclaw_agent_file_repo import OpenClawAgentFileRepository
from app.schemas.openclaw_agents import OpenClawAgentFileUpdate
from app.services.audit_service import write_audit_event

router = APIRouter()


def _require_openclaw_agent(agent_id: str, session: Session) -> None:
    if OpenClawAgentRepository(session).get(agent_id) is None:
        raise NotFoundError("OpenClaw agent not found")


@router.get(
    "/{agent_id}/files",
    tags=["Management"],
    summary="List OpenClaw workspace files",
    description="List stored workspace bootstrap files for an OpenClaw agent.",
)
def list_openclaw_agent_files(
    agent_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    _require_openclaw_agent(agent_id, session)
    repo = OpenClawAgentFileRepository(session)
    items = [
        {"agent_id": model.agent_id, "file_name": model.file_name, "content": model.content}
        for model in repo.list_for_agent(agent_id)
    ]
    write_audit_event(session, "openclaw_agent_files_listed", {"actor_id": manager.id, "agent_id": agent_id, "count": len(items)})
    return {"items": items}


@router.put(
    "/{agent_id}/files/{file_name}",
    tags=["Management"],
    summary="Upsert an OpenClaw workspace file",
    description="Create or update a stored OpenClaw workspace bootstrap file such as AGENTS.md.",
)
def upsert_openclaw_agent_file(
    agent_id: str,
    file_name: str,
    payload: OpenClawAgentFileUpdate,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict:
    _require_openclaw_agent(agent_id, session)
    repo = OpenClawAgentFileRepository(session)
    model = repo.upsert(
        OpenClawAgentFileModel(
            agent_id=agent_id,
            file_name=file_name,
            content=payload.content,
        )
    )
    write_audit_event(session, "openclaw_agent_file_upserted", {"actor_id": manager.id, "agent_id": agent_id, "file_name": file_name})
    return {"agent_id": model.agent_id, "file_name": model.file_name, "content": model.content}

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.db import get_db
from app.models.runtime_principal import RuntimePrincipal
from app.schemas.openclaw_memory import (
    OpenClawMemoryNoteCreate,
    OpenClawMemoryNoteListResponse,
    OpenClawMemoryNoteSummary,
)
from app.services.audit_service import write_audit_event
from app.services.openclaw_memory_service import create_memory_note, search_memory_notes

router = APIRouter(prefix="/api/openclaw/memory")


@router.get(
    "",
    response_model=OpenClawMemoryNoteListResponse,
    tags=["Agent Runtime"],
    summary="Search dream memory notes",
    description="Search explicit dream memory notes visible to the authenticated OpenClaw runtime.",
)
def list_openclaw_memory_notes(
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
    scope: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> dict:
    return {"items": search_memory_notes(session, agent=agent, scope=scope, tag=tag, query=q)}


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=OpenClawMemoryNoteSummary,
    tags=["Agent Runtime"],
    summary="Create one dream memory note",
    description="Create one explicit memory note tied to the authenticated OpenClaw runtime session.",
)
def create_openclaw_memory_note(
    payload: OpenClawMemoryNoteCreate,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    note = create_memory_note(
        session,
        agent=agent,
        scope=payload.scope,
        kind=payload.kind,
        importance=payload.importance,
        tags=payload.tags,
        content=payload.content,
    )
    write_audit_event(session, "openclaw_memory_note_created", {"agent_id": agent.id, "note_id": note["id"]})
    return note

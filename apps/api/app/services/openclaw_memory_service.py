from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.agent import AgentIdentity
from app.orm.openclaw_memory_note import OpenClawMemoryNoteModel
from app.repositories.openclaw_memory_repo import OpenClawMemoryRepository
from app.services.identifiers import new_resource_id
from app.services.openclaw_dream_policy_service import ensure_memory_write_allowed


def serialize_memory_note(model: OpenClawMemoryNoteModel) -> dict:
    return {
        "id": model.id,
        "agent_id": model.agent_id,
        "session_id": model.session_id,
        "run_id": model.run_id,
        "scope": model.scope,
        "kind": model.kind,
        "importance": model.importance,
        "tags": model.tags or [],
        "content": model.content,
        "updated_at": model.updated_at,
    }


def create_memory_note(
    session: Session,
    *,
    agent: AgentIdentity,
    scope: str,
    kind: str,
    importance: str,
    tags: list[str],
    content: str,
    run_id: str | None = None,
) -> dict:
    ensure_memory_write_allowed(agent)
    model = OpenClawMemoryNoteModel(
        id=new_resource_id("memory"),
        agent_id=agent.id,
        session_id=agent.session_id,
        run_id=run_id,
        scope=scope,
        kind=kind,
        importance=importance,
        tags=tags,
        content=content,
    )
    OpenClawMemoryRepository(session).create(model)
    return serialize_memory_note(model)


def search_memory_notes(
    session: Session,
    *,
    agent: AgentIdentity,
    scope: str | None = None,
    tag: str | None = None,
    query: str | None = None,
) -> list[dict]:
    items = OpenClawMemoryRepository(session).search(
        agent_id=agent.id,
        scope=scope,
        tag=tag,
        query=query,
    )
    return [serialize_memory_note(item) for item in items]

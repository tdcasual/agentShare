from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.orm.event import EventModel
from app.repositories.event_repo import EventRepository
from app.services.control_plane_links import derive_event_href
from app.services.identifiers import new_resource_id
from app.services.space_service import project_actor_activity_to_spaces


def record_event(
    session: Session,
    *,
    event_type: str,
    actor_type: str,
    actor_id: str,
    subject_type: str,
    subject_id: str,
    summary: str,
    details: str = "",
    severity: str = "info",
    action_url: str | None = None,
    metadata: dict | None = None,
) -> dict:
    model = EventModel(
        id=new_resource_id("event"),
        event_type=event_type,
        actor_type=actor_type,
        actor_id=actor_id,
        subject_type=subject_type,
        subject_id=subject_id,
        summary=summary,
        details=details,
        severity=severity,
        action_url=action_url,
        metadata_json=metadata or {},
    )
    EventRepository(session).create(model)
    project_actor_activity_to_spaces(
        session,
        actor_type=actor_type,
        actor_id=actor_id,
        entry_type=event_type,
        subject_type=subject_type,
        subject_id=subject_id,
        summary=summary,
    )
    return serialize_event(model)


def list_events(session: Session, *, limit: int = 100) -> list[dict]:
    return [serialize_event(model) for model in EventRepository(session).list_recent(limit=limit)]


def mark_event_read(session: Session, event_id: str) -> dict:
    repo = EventRepository(session)
    event = repo.mark_read(event_id)
    if event is None:
        raise NotFoundError("Event not found")
    return serialize_event(event)


def serialize_event(model: EventModel) -> dict:
    return {
        "id": model.id,
        "event_type": model.event_type,
        "actor_type": model.actor_type,
        "actor_id": model.actor_id,
        "subject_type": model.subject_type,
        "subject_id": model.subject_id,
        "summary": model.summary,
        "details": model.details,
        "severity": model.severity,
        "action_url": derive_event_href(
            action_url=model.action_url,
            subject_type=model.subject_type,
            subject_id=model.subject_id,
            metadata=model.metadata_json,
        ),
        "metadata": model.metadata_json or {},
        "read_at": model.read_at,
        "created_at": model.created_at,
        "updated_at": model.updated_at,
    }

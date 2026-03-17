from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.audit_event import AuditEventModel
from app.repositories.audit_repo import AuditEventRepository


def write_audit_event(session: Session, event_type: str, payload: dict) -> AuditEventModel:
    repo = AuditEventRepository(session)
    event = AuditEventModel(event_type=event_type, payload=payload)
    return repo.create(event)

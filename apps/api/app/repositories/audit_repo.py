from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.audit_event import AuditEventModel


class AuditEventRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: AuditEventModel) -> AuditEventModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, event_id: int) -> AuditEventModel | None:
        return self.session.get(AuditEventModel, event_id)

    def list_all(self) -> list[AuditEventModel]:
        return list(self.session.query(AuditEventModel).all())

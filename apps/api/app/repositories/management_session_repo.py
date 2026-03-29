from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.orm.management_session import ManagementSessionModel


class ManagementSessionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: ManagementSessionModel) -> ManagementSessionModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, session_id: str) -> ManagementSessionModel | None:
        return self.session.get(ManagementSessionModel, session_id)

    def revoke(
        self,
        session_id: str,
        *,
        revoked_at: datetime | None = None,
    ) -> ManagementSessionModel | None:
        model = self.get(session_id)
        if model is None:
            return None
        model.revoked_at = revoked_at or datetime.now(timezone.utc)
        self.session.flush()
        return model

    def update(self, model: ManagementSessionModel) -> ManagementSessionModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

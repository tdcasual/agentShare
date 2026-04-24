from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_session import OpenClawSessionModel
from app.services.openclaw_session_key_service import hash_openclaw_session_key


class OpenClawSessionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawSessionModel) -> OpenClawSessionModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, session_id: str) -> OpenClawSessionModel | None:
        return self.session.get(OpenClawSessionModel, session_id)

    def find_by_session_key(self, session_key: str) -> OpenClawSessionModel | None:
        return (
            self.session.query(OpenClawSessionModel)
            .filter(OpenClawSessionModel.session_key == hash_openclaw_session_key(session_key))
            .first()
        )

    def list_for_agent(self, agent_id: str) -> list[OpenClawSessionModel]:
        return (
            list(
                self.session.query(OpenClawSessionModel)
                .filter(OpenClawSessionModel.agent_id == agent_id)
                .order_by(OpenClawSessionModel.updated_at.desc())
                .all()
            )
        )

    def list_all(self) -> list[OpenClawSessionModel]:
        return list(
            self.session.query(OpenClawSessionModel)
            .order_by(OpenClawSessionModel.updated_at.desc())
            .all()
        )

    def delete(self, model: OpenClawSessionModel) -> None:
        self.session.delete(model)
        self.session.flush()

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_workbench_session import OpenClawWorkbenchSessionModel


class OpenClawWorkbenchSessionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawWorkbenchSessionModel) -> OpenClawWorkbenchSessionModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, session_id: str) -> OpenClawWorkbenchSessionModel | None:
        return self.session.get(OpenClawWorkbenchSessionModel, session_id)

    def list_for_agent(self, agent_id: str) -> list[OpenClawWorkbenchSessionModel]:
        return list(
            self.session.query(OpenClawWorkbenchSessionModel)
            .filter(OpenClawWorkbenchSessionModel.agent_id == agent_id)
            .order_by(OpenClawWorkbenchSessionModel.last_message_at.desc())
            .all()
        )

    def update(self, model: OpenClawWorkbenchSessionModel) -> OpenClawWorkbenchSessionModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

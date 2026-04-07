from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_agent_file import OpenClawAgentFileModel


class OpenClawAgentFileRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, agent_id: str, file_name: str) -> OpenClawAgentFileModel | None:
        return (
            self.session.query(OpenClawAgentFileModel)
            .filter(OpenClawAgentFileModel.agent_id == agent_id)
            .filter(OpenClawAgentFileModel.file_name == file_name)
            .first()
        )

    def upsert(self, model: OpenClawAgentFileModel) -> OpenClawAgentFileModel:
        existing = self.get(model.agent_id, model.file_name)
        if existing is None:
            self.session.add(model)
            self.session.flush()
            return model

        existing.content = model.content
        self.session.flush()
        return existing

    def list_for_agent(self, agent_id: str) -> list[OpenClawAgentFileModel]:
        return (
            list(
                self.session.query(OpenClawAgentFileModel)
                .filter(OpenClawAgentFileModel.agent_id == agent_id)
                .order_by(OpenClawAgentFileModel.file_name.asc())
                .all()
            )
        )

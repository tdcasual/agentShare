from __future__ import annotations

from sqlalchemy import asc, or_
from sqlalchemy.orm import Session

from app.orm.openclaw_agent import OpenClawAgentModel


class OpenClawAgentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawAgentModel) -> OpenClawAgentModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, agent_id: str) -> OpenClawAgentModel | None:
        return self.session.get(OpenClawAgentModel, agent_id)

    def list_all(self) -> list[OpenClawAgentModel]:
        return list(self.session.query(OpenClawAgentModel).order_by(OpenClawAgentModel.name.asc()).all())

    def search(self, query_text: str, *, limit: int) -> list[OpenClawAgentModel]:
        pattern = f"%{query_text}%"
        return list(
            self.session.query(OpenClawAgentModel)
            .filter(
                or_(
                    OpenClawAgentModel.id.ilike(pattern),
                    OpenClawAgentModel.name.ilike(pattern),
                    OpenClawAgentModel.status.ilike(pattern),
                    OpenClawAgentModel.workspace_root.ilike(pattern),
                    OpenClawAgentModel.agent_dir.ilike(pattern),
                    OpenClawAgentModel.sandbox_mode.ilike(pattern),
                    OpenClawAgentModel.model.ilike(pattern),
                    OpenClawAgentModel.thinking_level.ilike(pattern),
                )
            )
            .order_by(asc(OpenClawAgentModel.name), asc(OpenClawAgentModel.id))
            .limit(limit)
            .all()
        )

    def update(self, model: OpenClawAgentModel) -> OpenClawAgentModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

    def delete(self, agent_id: str) -> bool:
        model = self.get(agent_id)
        if model is None:
            return False
        self.session.delete(model)
        self.session.flush()
        return True

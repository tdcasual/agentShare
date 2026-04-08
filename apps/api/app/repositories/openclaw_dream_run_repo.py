from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_dream_run import OpenClawDreamRunModel


class OpenClawDreamRunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawDreamRunModel) -> OpenClawDreamRunModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, run_id: str) -> OpenClawDreamRunModel | None:
        return self.session.get(OpenClawDreamRunModel, run_id)

    def list_filtered(
        self,
        *,
        agent_id: str | None = None,
        session_id: str | None = None,
        status: str | None = None,
    ) -> list[OpenClawDreamRunModel]:
        query = self.session.query(OpenClawDreamRunModel)
        if agent_id is not None:
            query = query.filter(OpenClawDreamRunModel.agent_id == agent_id)
        if session_id is not None:
            query = query.filter(OpenClawDreamRunModel.session_id == session_id)
        if status is not None:
            query = query.filter(OpenClawDreamRunModel.status == status)
        return list(query.order_by(OpenClawDreamRunModel.updated_at.desc()).all())

    def update(self, model: OpenClawDreamRunModel) -> OpenClawDreamRunModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

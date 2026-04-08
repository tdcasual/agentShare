from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_dream_step import OpenClawDreamStepModel


class OpenClawDreamStepRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawDreamStepModel) -> OpenClawDreamStepModel:
        self.session.add(model)
        self.session.flush()
        return model

    def list_for_run(self, run_id: str) -> list[OpenClawDreamStepModel]:
        return list(
            self.session.query(OpenClawDreamStepModel)
            .filter(OpenClawDreamStepModel.run_id == run_id)
            .order_by(OpenClawDreamStepModel.step_index.asc())
            .all()
        )

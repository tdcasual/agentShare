from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.run import RunModel


class RunRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: RunModel) -> RunModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, run_id: str) -> RunModel | None:
        return self.session.get(RunModel, run_id)

    def list_all(self) -> list[RunModel]:
        return list(self.session.query(RunModel).all())

    def list_by_task(self, task_id: str) -> list[RunModel]:
        return list(
            self.session.query(RunModel)
            .filter(RunModel.task_id == task_id)
            .all()
        )

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.task_target import TaskTargetModel


class TaskTargetRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: TaskTargetModel) -> TaskTargetModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, target_id: str) -> TaskTargetModel | None:
        return self.session.get(TaskTargetModel, target_id)

    def list_by_task(self, task_id: str) -> list[TaskTargetModel]:
        return list(
            self.session.query(TaskTargetModel)
            .filter(TaskTargetModel.task_id == task_id)
            .all()
        )

    def list_assigned(self, access_token_id: str) -> list[TaskTargetModel]:
        return list(
            self.session.query(TaskTargetModel)
            .filter(TaskTargetModel.target_access_token_id == access_token_id)
            .all()
        )

    def find_by_task_and_access_token(
        self,
        task_id: str,
        access_token_id: str,
    ) -> TaskTargetModel | None:
        return (
            self.session.query(TaskTargetModel)
            .filter(TaskTargetModel.task_id == task_id)
            .filter(TaskTargetModel.target_access_token_id == access_token_id)
            .one_or_none()
        )

    def update(self, model: TaskTargetModel) -> TaskTargetModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

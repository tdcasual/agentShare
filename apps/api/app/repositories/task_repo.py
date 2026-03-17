from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.task import TaskModel


class TaskRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: TaskModel) -> TaskModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, task_id: str) -> TaskModel | None:
        return self.session.get(TaskModel, task_id)

    def list_all(self) -> list[TaskModel]:
        return list(self.session.query(TaskModel).all())

    def update(self, model: TaskModel) -> TaskModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

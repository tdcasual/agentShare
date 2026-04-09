from __future__ import annotations

from sqlalchemy import asc, desc, or_
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

    def list_all(self, *, limit: int | None = None, offset: int = 0) -> list[TaskModel]:
        query = self.session.query(TaskModel).order_by(
            desc(TaskModel.created_at),
            desc(TaskModel.id),
        )
        if offset:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return list(query.all())

    def list_active(self, *, limit: int | None = None, offset: int = 0) -> list[TaskModel]:
        query = (
            self.session.query(TaskModel)
            .filter(TaskModel.publication_status == "active")
            .order_by(desc(TaskModel.created_at), desc(TaskModel.id))
        )
        if offset:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        return list(query.all())

    def search_active(self, query_text: str, *, limit: int) -> list[TaskModel]:
        pattern = f"%{query_text}%"
        return list(
            self.session.query(TaskModel)
            .filter(TaskModel.publication_status == "active")
            .filter(
                or_(
                    TaskModel.id.ilike(pattern),
                    TaskModel.title.ilike(pattern),
                    TaskModel.task_type.ilike(pattern),
                    TaskModel.status.ilike(pattern),
                )
            )
            .order_by(desc(TaskModel.updated_at), asc(TaskModel.title), asc(TaskModel.id))
            .limit(limit)
            .all()
        )

    def update(self, model: TaskModel) -> TaskModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

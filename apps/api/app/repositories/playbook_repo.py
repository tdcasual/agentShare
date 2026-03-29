from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.orm.playbook import PlaybookModel


class PlaybookRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: PlaybookModel) -> PlaybookModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, playbook_id: str) -> PlaybookModel | None:
        return self.session.get(PlaybookModel, playbook_id)

    def list_all(self) -> list[PlaybookModel]:
        return list(self.session.query(PlaybookModel).all())

    def update(self, model: PlaybookModel) -> PlaybookModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

    def search(
        self,
        *,
        task_type: str | None = None,
        query: str | None = None,
    ) -> list[PlaybookModel]:
        statement = self.session.query(PlaybookModel)
        if task_type:
            statement = statement.filter(PlaybookModel.task_type == task_type)
        if query:
            pattern = f"%{query}%"
            statement = statement.filter(
                or_(
                    PlaybookModel.title.ilike(pattern),
                    PlaybookModel.body.ilike(pattern),
                )
            )
        return list(statement.all())

from __future__ import annotations

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

    def search_by_task_type(self, task_type: str) -> list[PlaybookModel]:
        return list(
            self.session.query(PlaybookModel)
            .filter(PlaybookModel.task_type == task_type)
            .all()
        )

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.playbook import PlaybookModel
from app.repositories.playbook_repo import PlaybookRepository
from app.schemas.playbooks import PlaybookCreate


def create_playbook(session: Session, payload: PlaybookCreate) -> dict:
    repo = PlaybookRepository(session)
    playbook_id = f"playbook-{len(repo.list_all()) + 1}"
    model = PlaybookModel(
        id=playbook_id,
        title=payload.title,
        task_type=payload.task_type,
        body=payload.body,
        tags=payload.tags,
    )
    repo.create(model)
    return _to_dict(model)


def search_playbooks(session: Session, task_type: str | None = None) -> list[dict]:
    repo = PlaybookRepository(session)
    if task_type is None:
        return [_to_dict(m) for m in repo.list_all()]
    return [_to_dict(m) for m in repo.search_by_task_type(task_type)]


def _to_dict(model: PlaybookModel) -> dict:
    return {
        "id": model.id,
        "title": model.title,
        "task_type": model.task_type,
        "body": model.body,
        "tags": model.tags,
    }

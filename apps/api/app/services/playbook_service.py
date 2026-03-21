from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.orm.playbook import PlaybookModel
from app.repositories.playbook_repo import PlaybookRepository
from app.schemas.playbooks import PlaybookCreate


@dataclass(frozen=True)
class PlaybookSearchResult:
    items: list[dict]
    total: int
    applied_filters: dict[str, str]


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


def get_playbook(session: Session, playbook_id: str) -> dict | None:
    repo = PlaybookRepository(session)
    model = repo.get(playbook_id)
    if model is None:
        return None
    return _to_dict(model)


def search_playbooks(
    session: Session,
    *,
    task_type: str | None = None,
    query: str | None = None,
    tag: str | None = None,
) -> PlaybookSearchResult:
    repo = PlaybookRepository(session)
    models = repo.search(task_type=task_type, query=query)
    if tag:
        models = [model for model in models if tag in (model.tags or [])]

    applied_filters: dict[str, str] = {}
    if task_type:
        applied_filters["task_type"] = task_type
    if query:
        applied_filters["q"] = query
    if tag:
        applied_filters["tag"] = tag

    return PlaybookSearchResult(
        items=[_to_dict(model) for model in models],
        total=len(models),
        applied_filters=applied_filters,
    )


def _to_dict(model: PlaybookModel) -> dict:
    return {
        "id": model.id,
        "title": model.title,
        "task_type": model.task_type,
        "body": model.body,
        "tags": model.tags,
    }

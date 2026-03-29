from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.errors import NotFoundError
from app.orm.playbook import PlaybookModel
from app.repositories.playbook_repo import PlaybookRepository
from app.schemas.playbooks import PlaybookCreate
from app.services.identifiers import new_resource_id
from app.services.review_service import publication_status_for_actor


@dataclass(frozen=True)
class PlaybookSearchResult:
    items: list[dict]
    total: int
    applied_filters: dict[str, str]


def create_playbook(session: Session, payload: PlaybookCreate, *, actor=None) -> dict:
    if actor is None:
        actor = type("SystemActor", (), {"actor_type": "human", "id": "system", "token_id": None})()
    repo = PlaybookRepository(session)
    playbook_id = new_resource_id("playbook")
    model = PlaybookModel(
        id=playbook_id,
        title=payload.title,
        task_type=payload.task_type,
        body=payload.body,
        tags=payload.tags,
        created_by_actor_type=actor.actor_type,
        created_by_actor_id=actor.id,
        created_via_token_id=getattr(actor, "token_id", None),
        publication_status=publication_status_for_actor(actor.actor_type),
    )
    repo.create(model)
    return _to_dict(model)


def get_playbook(session: Session, playbook_id: str) -> dict:
    repo = PlaybookRepository(session)
    model = repo.get(playbook_id)
    if model is None:
        raise NotFoundError("Playbook not found")
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
        "publication_status": model.publication_status,
    }

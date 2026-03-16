from __future__ import annotations

from app.models.playbook import PlaybookRecord
from app.schemas.playbooks import PlaybookCreate
from app.store import next_id, store


def create_playbook(payload: PlaybookCreate) -> dict:
    playbook = PlaybookRecord(
        id=next_id("playbook"),
        title=payload.title,
        task_type=payload.task_type,
        body=payload.body,
        tags=payload.tags,
    )
    record = playbook.model_dump()
    store.playbooks[playbook.id] = record
    return record


def search_playbooks(task_type: str | None = None) -> list[dict]:
    items = list(store.playbooks.values())
    if task_type is None:
        return items
    return [item for item in items if item["task_type"] == task_type]

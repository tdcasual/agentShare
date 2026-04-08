from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.openclaw_memory_note import OpenClawMemoryNoteModel


class OpenClawMemoryRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: OpenClawMemoryNoteModel) -> OpenClawMemoryNoteModel:
        self.session.add(model)
        self.session.flush()
        return model

    def search(
        self,
        *,
        agent_id: str,
        scope: str | None = None,
        tag: str | None = None,
        query: str | None = None,
    ) -> list[OpenClawMemoryNoteModel]:
        items = list(
            self.session.query(OpenClawMemoryNoteModel)
            .filter(OpenClawMemoryNoteModel.agent_id == agent_id)
            .order_by(OpenClawMemoryNoteModel.updated_at.desc())
            .all()
        )
        results = items
        if scope is not None:
            results = [item for item in results if item.scope == scope]
        if tag is not None:
            results = [item for item in results if tag in (item.tags or [])]
        if query is not None:
            normalized = query.lower()
            results = [item for item in results if normalized in item.content.lower()]
        return results

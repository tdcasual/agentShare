from __future__ import annotations

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.orm.event import EventModel


class EventRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: EventModel) -> EventModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, event_id: str) -> EventModel | None:
        return self.session.get(EventModel, event_id)

    def list_recent(self, *, limit: int = 100) -> list[EventModel]:
        return list(
            self.session.query(EventModel)
            .order_by(desc(EventModel.created_at))
            .limit(limit)
            .all()
        )

    def mark_read(self, event_id: str) -> EventModel | None:
        event = self.get(event_id)
        if event is None:
            return None
        self.session.add(event)
        self.session.flush()
        return event

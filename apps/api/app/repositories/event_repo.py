from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import desc, or_
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

    def search(self, query_text: str, *, limit: int) -> list[EventModel]:
        pattern = f"%{query_text}%"
        return list(
            self.session.query(EventModel)
            .filter(
                or_(
                    EventModel.id.ilike(pattern),
                    EventModel.summary.ilike(pattern),
                    EventModel.event_type.ilike(pattern),
                    EventModel.subject_id.ilike(pattern),
                    EventModel.actor_id.ilike(pattern),
                )
            )
            .order_by(desc(EventModel.created_at), desc(EventModel.id))
            .limit(limit)
            .all()
        )

    def mark_read(self, event_id: str) -> EventModel | None:
        event = self.get(event_id)
        if event is None:
            return None
        if event.read_at is None:
            event.read_at = datetime.now(timezone.utc)
        self.session.add(event)
        self.session.flush()
        return event

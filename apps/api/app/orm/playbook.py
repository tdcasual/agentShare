from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class PlaybookModel(Base, TimestampMixin):
    __tablename__ = "playbooks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_by_actor_type: Mapped[str] = mapped_column(String, default="human")
    created_by_actor_id: Mapped[str] = mapped_column(String, default="human")
    created_via_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    publication_status: Mapped[str] = mapped_column(String, default="active")
    reviewed_by_actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_reason: Mapped[str] = mapped_column(String, default="", server_default="")

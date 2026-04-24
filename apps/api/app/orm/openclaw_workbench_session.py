from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawWorkbenchSessionModel(Base, TimestampMixin):
    __tablename__ = "openclaw_workbench_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    capability_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False, default="New conversation")
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

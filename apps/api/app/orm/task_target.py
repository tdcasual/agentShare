from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class TaskTargetModel(Base, TimestampMixin):
    __tablename__ = "task_targets"
    __table_args__ = (
        UniqueConstraint("task_id", "target_access_token_id", name="ix_task_targets_task_access_token_unique"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    task_id: Mapped[str] = mapped_column(String, nullable=False)
    target_access_token_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="pending")
    claimed_by_access_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    claimed_by_agent_id: Mapped[str | None] = mapped_column(String, nullable=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_run_id: Mapped[str | None] = mapped_column(String, nullable=True)

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class TaskModel(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    input: Mapped[dict] = mapped_column(JSON, default=dict)
    required_capability_ids: Mapped[list] = mapped_column(JSON, default=list)
    playbook_ids: Mapped[list] = mapped_column(JSON, default=list)
    lease_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_mode: Mapped[str] = mapped_column(String, default="auto")
    approval_rules: Mapped[list] = mapped_column(JSON, default=list)
    priority: Mapped[str] = mapped_column(String, default="normal")
    target_mode: Mapped[str] = mapped_column(String, default="broadcast")
    target_access_token_ids: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String, default="pending")
    created_by: Mapped[str] = mapped_column(String, default="human")
    created_by_actor_type: Mapped[str] = mapped_column(String, default="human")
    created_by_actor_id: Mapped[str] = mapped_column(String, default="human")
    created_via_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    publication_status: Mapped[str] = mapped_column(String, default="active")
    reviewed_by_actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    review_reason: Mapped[str] = mapped_column(String, default="", server_default="")
    claimed_by: Mapped[str | None] = mapped_column(String, nullable=True)

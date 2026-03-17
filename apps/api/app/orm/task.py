from sqlalchemy import JSON, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class TaskModel(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    task_type: Mapped[str] = mapped_column(String, nullable=False)
    input: Mapped[dict] = mapped_column(JSON, default=dict)
    required_capability_ids: Mapped[list] = mapped_column(JSON, default=list)
    lease_allowed: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_mode: Mapped[str] = mapped_column(String, default="auto")
    priority: Mapped[str] = mapped_column(String, default="normal")
    status: Mapped[str] = mapped_column(String, default="pending")
    created_by: Mapped[str] = mapped_column(String, default="human")
    claimed_by: Mapped[str | None] = mapped_column(String, nullable=True)

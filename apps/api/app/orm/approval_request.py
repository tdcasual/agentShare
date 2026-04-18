from datetime import datetime

from sqlalchemy import DateTime, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class ApprovalRequestModel(Base, TimestampMixin):
    __tablename__ = "approval_requests"
    __table_args__ = (
        Index(
            "uq_approval_requests_pending_scope",
            "task_id",
            "capability_id",
            "agent_id",
            "token_id",
            "task_target_id",
            "action_type",
            unique=True,
            sqlite_where=text("status = 'pending'"),
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    task_id: Mapped[str] = mapped_column(String, nullable=False)
    capability_id: Mapped[str] = mapped_column(String, nullable=False)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    token_id: Mapped[str] = mapped_column(String, nullable=False, default="")
    task_target_id: Mapped[str] = mapped_column(String, nullable=False, default="")
    action_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    reason: Mapped[str] = mapped_column(String, default="")
    policy_reason: Mapped[str] = mapped_column(String, default="")
    policy_source: Mapped[str | None] = mapped_column(String, nullable=True)
    requested_by: Mapped[str] = mapped_column(String, nullable=False)
    decided_by: Mapped[str | None] = mapped_column(String, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

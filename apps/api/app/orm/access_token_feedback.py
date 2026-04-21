from sqlalchemy import Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class AccessTokenFeedbackModel(Base, TimestampMixin):
    __tablename__ = "access_token_feedback"
    __table_args__ = (
        UniqueConstraint("task_target_id", name="uq_access_token_feedback_task_target_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    access_token_id: Mapped[str] = mapped_column(String, nullable=False)
    task_target_id: Mapped[str] = mapped_column(String, nullable=False)
    run_id: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, default="human_review")
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    verdict: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_by_actor_type: Mapped[str] = mapped_column(String, nullable=False)
    created_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)

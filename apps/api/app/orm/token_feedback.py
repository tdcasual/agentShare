from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class TokenFeedbackModel(Base, TimestampMixin):
    __tablename__ = "token_feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    token_id: Mapped[str] = mapped_column(String, nullable=False)
    task_target_id: Mapped[str] = mapped_column(String, nullable=False)
    run_id: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, default="human_review")
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    verdict: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_by_actor_type: Mapped[str] = mapped_column(String, nullable=False)
    created_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)

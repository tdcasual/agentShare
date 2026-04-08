from sqlalchemy import JSON, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawDreamRunModel(Base, TimestampMixin):
    __tablename__ = "openclaw_dream_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    session_id: Mapped[str] = mapped_column(String, nullable=False)
    task_id: Mapped[str | None] = mapped_column(String, nullable=True)
    objective: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    stop_reason: Mapped[str | None] = mapped_column(String, nullable=True)
    step_budget: Mapped[int] = mapped_column(Integer, default=1)
    consumed_steps: Mapped[int] = mapped_column(Integer, default=0)
    created_followup_tasks: Mapped[int] = mapped_column(Integer, default=0)
    started_by_actor_type: Mapped[str] = mapped_column(String, default="agent")
    started_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)
    runtime_metadata: Mapped[dict] = mapped_column(JSON, default=dict)

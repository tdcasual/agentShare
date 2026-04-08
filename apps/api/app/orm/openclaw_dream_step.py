from sqlalchemy import JSON, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawDreamStepModel(Base, TimestampMixin):
    __tablename__ = "openclaw_dream_steps"
    __table_args__ = (
        UniqueConstraint("run_id", "step_index", name="uq_openclaw_dream_steps_run_step_index"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    run_id: Mapped[str] = mapped_column(String, nullable=False)
    step_index: Mapped[int] = mapped_column(Integer, nullable=False)
    step_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="completed")
    input_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    output_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    token_usage: Mapped[dict] = mapped_column(JSON, default=dict)
    created_task_id: Mapped[str | None] = mapped_column(String, nullable=True)

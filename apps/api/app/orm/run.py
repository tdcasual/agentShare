from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class RunModel(Base, TimestampMixin):
    __tablename__ = "runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    task_id: Mapped[str] = mapped_column(String, nullable=False)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    task_target_id: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    result_summary: Mapped[str] = mapped_column(String, default="")
    output_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    error_summary: Mapped[str] = mapped_column(String, default="")
    capability_invocations: Mapped[list] = mapped_column(JSON, default=list)
    lease_events: Mapped[list] = mapped_column(JSON, default=list)

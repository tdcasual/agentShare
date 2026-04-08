from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawAgentModel(Base, TimestampMixin):
    __tablename__ = "openclaw_agents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    auth_method: Mapped[str] = mapped_column(String, default="openclaw_session")
    risk_tier: Mapped[str] = mapped_column(String, default="medium")
    workspace_root: Mapped[str] = mapped_column(String, nullable=False)
    agent_dir: Mapped[str] = mapped_column(String, nullable=False)
    model: Mapped[str | None] = mapped_column(String, nullable=True)
    thinking_level: Mapped[str] = mapped_column(String, default="balanced")
    sandbox_mode: Mapped[str] = mapped_column(String, default="workspace-write")
    tools_policy: Mapped[dict] = mapped_column(JSON, default=dict)
    skills_policy: Mapped[dict] = mapped_column(JSON, default=dict)
    dream_policy: Mapped[dict] = mapped_column(JSON, default=dict)
    allowed_capability_ids: Mapped[list] = mapped_column(JSON, default=list)
    allowed_task_types: Mapped[list] = mapped_column(JSON, default=list)

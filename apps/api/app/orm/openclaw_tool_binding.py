from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawToolBindingModel(Base, TimestampMixin):
    __tablename__ = "openclaw_tool_bindings"
    __table_args__ = (UniqueConstraint("agent_id", "name", name="uq_openclaw_tool_bindings_agent_name"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    binding_kind: Mapped[str] = mapped_column(String, nullable=False)
    binding_target: Mapped[str] = mapped_column(String, nullable=False)
    approval_mode: Mapped[str] = mapped_column(String, default="auto")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class AgentIdentityModel(Base, TimestampMixin):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    issuer: Mapped[str] = mapped_column(String, default="local")
    auth_method: Mapped[str] = mapped_column(String, default="api_key")
    status: Mapped[str] = mapped_column(String, default="active")
    api_key_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    allowed_capability_ids: Mapped[list] = mapped_column(JSON, default=list)
    allowed_task_types: Mapped[list] = mapped_column(JSON, default=list)
    risk_tier: Mapped[str] = mapped_column(String, default="medium")

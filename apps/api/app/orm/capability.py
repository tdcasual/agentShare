from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class CapabilityModel(Base, TimestampMixin):
    __tablename__ = "capabilities"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    secret_id: Mapped[str] = mapped_column(String, nullable=False)
    allowed_mode: Mapped[str] = mapped_column(String, default="proxy_only")
    lease_ttl_seconds: Mapped[int] = mapped_column(Integer, default=60)
    risk_level: Mapped[str] = mapped_column(String, nullable=False)
    approval_mode: Mapped[str] = mapped_column(String, default="auto")
    approval_rules: Mapped[list] = mapped_column(JSON, default=list)
    allowed_audience: Mapped[list] = mapped_column(JSON, default=list)
    required_provider: Mapped[str | None] = mapped_column(String, nullable=True)
    required_provider_scopes: Mapped[list] = mapped_column(JSON, default=list)
    allowed_environments: Mapped[list] = mapped_column(JSON, default=list)
    adapter_type: Mapped[str] = mapped_column(String, default="generic_http")
    adapter_config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by_actor_type: Mapped[str] = mapped_column(String, default="human")
    created_by_actor_id: Mapped[str] = mapped_column(String, default="human")
    created_via_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    publication_status: Mapped[str] = mapped_column(String, default="active")
    reviewed_by_actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

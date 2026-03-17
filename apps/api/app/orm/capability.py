from sqlalchemy import JSON, Integer, String
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
    allowed_audience: Mapped[list] = mapped_column(JSON, default=list)
    adapter_type: Mapped[str] = mapped_column(String, default="generic_http")
    adapter_config: Mapped[dict] = mapped_column(JSON, default=dict)

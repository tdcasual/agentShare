from datetime import datetime

from sqlalchemy import JSON, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class SecretModel(Base, TimestampMixin):
    __tablename__ = "secrets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    scope: Mapped[dict] = mapped_column(JSON, default=dict)
    provider: Mapped[str] = mapped_column(String, nullable=False, default="generic")
    environment: Mapped[str | None] = mapped_column(String, nullable=True)
    provider_scopes: Mapped[list] = mapped_column(JSON, default=list)
    resource_selector: Mapped[str | None] = mapped_column(String, nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    backend_ref: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[str] = mapped_column(String, default="human")
    created_by_actor_type: Mapped[str] = mapped_column(String, default="human")
    created_by_actor_id: Mapped[str] = mapped_column(String, default="human")
    created_via_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    publication_status: Mapped[str] = mapped_column(String, default="active")
    reviewed_by_actor_id: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

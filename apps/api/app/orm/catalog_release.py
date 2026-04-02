from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class CatalogReleaseModel(Base, TimestampMixin):
    __tablename__ = "catalog_releases"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    resource_kind: Mapped[str] = mapped_column(String, nullable=False)
    resource_id: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    release_status: Mapped[str] = mapped_column(String, nullable=False, default="published")
    released_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)
    created_via_token_id: Mapped[str | None] = mapped_column(String, nullable=True)
    adoption_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

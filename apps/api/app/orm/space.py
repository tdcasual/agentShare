from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class SpaceModel(Base, TimestampMixin):
    __tablename__ = "spaces"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String, default="active")
    created_by_actor_id: Mapped[str] = mapped_column(String, nullable=False)

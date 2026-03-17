from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class SecretModel(Base, TimestampMixin):
    __tablename__ = "secrets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    scope: Mapped[dict] = mapped_column(JSON, default=dict)
    backend_ref: Mapped[str] = mapped_column(String, nullable=False)
    created_by: Mapped[str] = mapped_column(String, default="human")

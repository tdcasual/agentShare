from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class PendingSecretMaterialModel(Base, TimestampMixin):
    __tablename__ = "pending_secret_materials"

    secret_id: Mapped[str] = mapped_column(String, primary_key=True)
    secret_value: Mapped[str] = mapped_column(Text, nullable=False)

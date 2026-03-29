from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class SystemSettingModel(Base, TimestampMixin):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value_json: Mapped[dict] = mapped_column(JSON, default=dict)

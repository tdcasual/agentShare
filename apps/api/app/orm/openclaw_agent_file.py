from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawAgentFileModel(Base, TimestampMixin):
    __tablename__ = "openclaw_agent_files"

    agent_id: Mapped[str] = mapped_column(String, primary_key=True)
    file_name: Mapped[str] = mapped_column(String, primary_key=True)
    content: Mapped[str] = mapped_column(Text, default="")

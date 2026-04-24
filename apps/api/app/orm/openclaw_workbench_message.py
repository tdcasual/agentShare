from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawWorkbenchMessageModel(Base, TimestampMixin):
    __tablename__ = "openclaw_workbench_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    message_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

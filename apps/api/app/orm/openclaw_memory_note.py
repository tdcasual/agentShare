from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class OpenClawMemoryNoteModel(Base, TimestampMixin):
    __tablename__ = "openclaw_memory_notes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    agent_id: Mapped[str] = mapped_column(String, nullable=False)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    scope: Mapped[str] = mapped_column(String, default="agent")
    kind: Mapped[str] = mapped_column(String, default="working_note")
    importance: Mapped[str] = mapped_column(String, default="medium")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    content: Mapped[str] = mapped_column(Text, default="")

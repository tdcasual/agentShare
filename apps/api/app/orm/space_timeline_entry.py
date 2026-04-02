from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class SpaceTimelineEntryModel(Base, TimestampMixin):
    __tablename__ = "space_timeline_entries"
    __table_args__ = (
        UniqueConstraint(
            "space_id",
            "entry_type",
            "subject_type",
            "subject_id",
            name="uq_space_timeline_identity",
        ),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    space_id: Mapped[str] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_type: Mapped[str] = mapped_column(String, nullable=False)
    subject_id: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)

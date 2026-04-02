from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.orm.base import Base, TimestampMixin


class SpaceMemberModel(Base, TimestampMixin):
    __tablename__ = "space_members"
    __table_args__ = (
        UniqueConstraint("space_id", "member_type", "member_id", name="uq_space_members_identity"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    space_id: Mapped[str] = mapped_column(ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False, index=True)
    member_type: Mapped[str] = mapped_column(String, nullable=False)
    member_id: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="participant")

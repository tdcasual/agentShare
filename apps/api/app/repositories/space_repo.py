from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.space import SpaceModel
from app.orm.space_member import SpaceMemberModel
from app.orm.space_timeline_entry import SpaceTimelineEntryModel


class SpaceRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create_space(self, model: SpaceModel) -> SpaceModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get_space(self, space_id: str) -> SpaceModel | None:
        return self.session.get(SpaceModel, space_id)

    def list_spaces(self) -> list[SpaceModel]:
        return list(
            self.session.query(SpaceModel)
            .order_by(SpaceModel.created_at.desc())
            .all()
        )

    def list_spaces_for_agent(self, agent_id: str) -> list[SpaceModel]:
        return list(
            self.session.query(SpaceModel)
            .join(SpaceMemberModel, SpaceMemberModel.space_id == SpaceModel.id)
            .filter(
                SpaceMemberModel.member_type == "agent",
                SpaceMemberModel.member_id == agent_id,
            )
            .order_by(SpaceModel.created_at.desc())
            .all()
        )

    def create_member(self, model: SpaceMemberModel) -> SpaceMemberModel:
        self.session.add(model)
        self.session.flush()
        return model

    def list_members(self, space_id: str) -> list[SpaceMemberModel]:
        return list(
            self.session.query(SpaceMemberModel)
            .filter(SpaceMemberModel.space_id == space_id)
            .order_by(SpaceMemberModel.created_at.asc())
            .all()
        )

    def create_timeline_entry(self, model: SpaceTimelineEntryModel) -> SpaceTimelineEntryModel:
        self.session.add(model)
        self.session.flush()
        return model

    def find_timeline_entry(
        self,
        *,
        space_id: str,
        entry_type: str,
        subject_type: str,
        subject_id: str,
    ) -> SpaceTimelineEntryModel | None:
        return (
            self.session.query(SpaceTimelineEntryModel)
            .filter(
                SpaceTimelineEntryModel.space_id == space_id,
                SpaceTimelineEntryModel.entry_type == entry_type,
                SpaceTimelineEntryModel.subject_type == subject_type,
                SpaceTimelineEntryModel.subject_id == subject_id,
            )
            .first()
        )

    def list_timeline(self, space_id: str) -> list[SpaceTimelineEntryModel]:
        return list(
            self.session.query(SpaceTimelineEntryModel)
            .filter(SpaceTimelineEntryModel.space_id == space_id)
            .order_by(SpaceTimelineEntryModel.created_at.desc())
            .all()
        )

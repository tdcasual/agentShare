from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.approval_request import ApprovalRequestModel


class ApprovalRequestRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: ApprovalRequestModel) -> ApprovalRequestModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, approval_id: str) -> ApprovalRequestModel | None:
        return self.session.get(ApprovalRequestModel, approval_id)

    def list_all(self) -> list[ApprovalRequestModel]:
        return list(self.session.query(ApprovalRequestModel).all())

    def list_by_status(self, status: str) -> list[ApprovalRequestModel]:
        return list(
            self.session.query(ApprovalRequestModel)
            .filter(ApprovalRequestModel.status == status)
            .all()
        )

    def get_latest_for_scope(
        self,
        *,
        task_id: str,
        capability_id: str,
        agent_id: str,
        action_type: str,
    ) -> ApprovalRequestModel | None:
        return (
            self.session.query(ApprovalRequestModel)
            .filter(ApprovalRequestModel.task_id == task_id)
            .filter(ApprovalRequestModel.capability_id == capability_id)
            .filter(ApprovalRequestModel.agent_id == agent_id)
            .filter(ApprovalRequestModel.action_type == action_type)
            .order_by(ApprovalRequestModel.created_at.desc())
            .first()
        )

    def update(self, model: ApprovalRequestModel) -> ApprovalRequestModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

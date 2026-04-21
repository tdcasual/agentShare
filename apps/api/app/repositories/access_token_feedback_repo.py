from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.access_token_feedback import AccessTokenFeedbackModel


class AccessTokenFeedbackRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: AccessTokenFeedbackModel) -> AccessTokenFeedbackModel:
        self.session.add(model)
        self.session.flush()
        return model

    def list_by_access_token(self, access_token_id: str) -> list[AccessTokenFeedbackModel]:
        return list(
            self.session.query(AccessTokenFeedbackModel)
            .filter(AccessTokenFeedbackModel.access_token_id == access_token_id)
            .all()
        )

    def list_by_access_tokens(self, access_token_ids: list[str]) -> list[AccessTokenFeedbackModel]:
        if not access_token_ids:
            return []
        return list(
            self.session.query(AccessTokenFeedbackModel)
            .filter(AccessTokenFeedbackModel.access_token_id.in_(access_token_ids))
            .all()
        )

    def get_by_task_target(self, task_target_id: str) -> AccessTokenFeedbackModel | None:
        return (
            self.session.query(AccessTokenFeedbackModel)
            .filter(AccessTokenFeedbackModel.task_target_id == task_target_id)
            .one_or_none()
        )

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.token_feedback import TokenFeedbackModel


class TokenFeedbackRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: TokenFeedbackModel) -> TokenFeedbackModel:
        self.session.add(model)
        self.session.flush()
        return model

    def list_by_token(self, token_id: str) -> list[TokenFeedbackModel]:
        return list(
            self.session.query(TokenFeedbackModel)
            .filter(TokenFeedbackModel.token_id == token_id)
            .all()
        )

    def list_by_tokens(self, token_ids: list[str]) -> list[TokenFeedbackModel]:
        if not token_ids:
            return []
        return list(
            self.session.query(TokenFeedbackModel)
            .filter(TokenFeedbackModel.token_id.in_(token_ids))
            .all()
        )

    def get_by_task_target(self, task_target_id: str) -> TokenFeedbackModel | None:
        return (
            self.session.query(TokenFeedbackModel)
            .filter(TokenFeedbackModel.task_target_id == task_target_id)
            .one_or_none()
        )

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.orm.agent_token import AgentTokenModel


class AgentTokenRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: AgentTokenModel) -> AgentTokenModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, token_id: str) -> AgentTokenModel | None:
        return self.session.get(AgentTokenModel, token_id)

    def list_by_agent(self, agent_id: str) -> list[AgentTokenModel]:
        return list(
            self.session.query(AgentTokenModel)
            .filter(AgentTokenModel.agent_id == agent_id)
            .all()
        )

    def find_by_token_hash(self, token_hash: str) -> AgentTokenModel | None:
        return (
            self.session.query(AgentTokenModel)
            .filter(AgentTokenModel.token_hash == token_hash)
            .one_or_none()
        )

    def revoke(
        self,
        token_id: str,
        *,
        revoked_at: datetime | None = None,
    ) -> AgentTokenModel | None:
        token = self.get(token_id)
        if token is None:
            return None
        token.status = "revoked"
        token.last_used_at = revoked_at or datetime.now(timezone.utc)
        self.session.flush()
        return token

    def update(self, model: AgentTokenModel) -> AgentTokenModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

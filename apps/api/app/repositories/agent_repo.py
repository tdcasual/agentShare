from __future__ import annotations

from sqlalchemy import asc, or_
from sqlalchemy.orm import Session

from app.orm.agent import AgentIdentityModel


class AgentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: AgentIdentityModel) -> AgentIdentityModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, agent_id: str) -> AgentIdentityModel | None:
        return self.session.get(AgentIdentityModel, agent_id)

    def list_all(self) -> list[AgentIdentityModel]:
        return list(self.session.query(AgentIdentityModel).all())

    def search(self, query_text: str, *, limit: int) -> list[AgentIdentityModel]:
        pattern = f"%{query_text}%"
        return list(
            self.session.query(AgentIdentityModel)
            .filter(
                or_(
                    AgentIdentityModel.id.ilike(pattern),
                    AgentIdentityModel.name.ilike(pattern),
                    AgentIdentityModel.status.ilike(pattern),
                    AgentIdentityModel.risk_tier.ilike(pattern),
                )
            )
            .order_by(asc(AgentIdentityModel.name), asc(AgentIdentityModel.id))
            .limit(limit)
            .all()
        )

    def find_bootstrap_by_api_key_hash(self, api_key_hash: str) -> AgentIdentityModel | None:
        return (
            self.session.query(AgentIdentityModel)
            .filter(AgentIdentityModel.id == "bootstrap")
            .filter(AgentIdentityModel.api_key_hash == api_key_hash)
            .first()
        )

    def delete(self, agent_id: str) -> bool:
        agent = self.get(agent_id)
        if agent is None:
            return False
        self.session.delete(agent)
        self.session.flush()
        return True

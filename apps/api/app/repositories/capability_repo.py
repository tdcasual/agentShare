from __future__ import annotations

from sqlalchemy import asc, or_
from sqlalchemy.orm import Session

from app.orm.capability import CapabilityModel


class CapabilityRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: CapabilityModel) -> CapabilityModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, capability_id: str) -> CapabilityModel | None:
        return self.session.get(CapabilityModel, capability_id)

    def list_all(self) -> list[CapabilityModel]:
        return list(self.session.query(CapabilityModel).all())

    def search(self, query_text: str, *, limit: int) -> list[CapabilityModel]:
        pattern = f"%{query_text}%"
        return list(
            self.session.query(CapabilityModel)
            .filter(
                or_(
                    CapabilityModel.id.ilike(pattern),
                    CapabilityModel.name.ilike(pattern),
                    CapabilityModel.required_provider.ilike(pattern),
                    CapabilityModel.allowed_mode.ilike(pattern),
                    CapabilityModel.risk_level.ilike(pattern),
                )
            )
            .order_by(asc(CapabilityModel.name), asc(CapabilityModel.id))
            .limit(limit)
            .all()
        )

    def update(self, model: CapabilityModel) -> CapabilityModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

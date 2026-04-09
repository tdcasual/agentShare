from __future__ import annotations

from sqlalchemy import asc, or_
from sqlalchemy.orm import Session

from app.orm.secret import SecretModel


class SecretRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: SecretModel) -> SecretModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, secret_id: str) -> SecretModel | None:
        return self.session.get(SecretModel, secret_id)

    def list_all(self) -> list[SecretModel]:
        return list(self.session.query(SecretModel).all())

    def search(self, query_text: str, *, limit: int) -> list[SecretModel]:
        pattern = f"%{query_text}%"
        return list(
            self.session.query(SecretModel)
            .filter(
                or_(
                    SecretModel.id.ilike(pattern),
                    SecretModel.display_name.ilike(pattern),
                    SecretModel.provider.ilike(pattern),
                    SecretModel.kind.ilike(pattern),
                )
            )
            .order_by(asc(SecretModel.display_name), asc(SecretModel.id))
            .limit(limit)
            .all()
        )

    def update(self, model: SecretModel) -> SecretModel:
        merged = self.session.merge(model)
        self.session.flush()
        return merged

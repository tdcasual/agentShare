from __future__ import annotations

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

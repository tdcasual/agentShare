from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.pending_secret_material import PendingSecretMaterialModel


class PendingSecretMaterialRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: PendingSecretMaterialModel) -> PendingSecretMaterialModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, secret_id: str) -> PendingSecretMaterialModel | None:
        return self.session.get(PendingSecretMaterialModel, secret_id)

    def delete(self, secret_id: str) -> None:
        model = self.get(secret_id)
        if model is not None:
            self.session.delete(model)
            self.session.flush()

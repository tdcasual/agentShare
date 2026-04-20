from __future__ import annotations

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.orm.access_token import AccessTokenModel


class AccessTokenRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: AccessTokenModel) -> AccessTokenModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, token_id: str) -> AccessTokenModel | None:
        return self.session.get(AccessTokenModel, token_id)

    def find_by_token_hash(self, token_hash: str) -> AccessTokenModel | None:
        return (
            self.session.query(AccessTokenModel)
            .filter(AccessTokenModel.token_hash == token_hash)
            .one_or_none()
        )

    def list_all(self) -> list[AccessTokenModel]:
        return list(
            self.session.query(AccessTokenModel)
            .order_by(AccessTokenModel.display_name.asc(), AccessTokenModel.id.asc())
            .all()
        )

    def list_active(self) -> list[AccessTokenModel]:
        return list(
            self.session.query(AccessTokenModel)
            .filter(AccessTokenModel.status == "active")
            .all()
        )

    def update(self, model: AccessTokenModel) -> AccessTokenModel:
        merged = self.session.merge(model)
        for field_name in ("scopes", "labels", "policy"):
            flag_modified(merged, field_name)
        self.session.flush()
        return merged

    def revoke(self, token_id: str) -> AccessTokenModel | None:
        token = self.get(token_id)
        if token is None:
            return None
        token.status = "revoked"
        self.session.flush()
        return token

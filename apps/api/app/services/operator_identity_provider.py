from __future__ import annotations

from typing import Protocol

from sqlalchemy.orm import Session

from app.config import Settings
from app.orm.human_account import HumanAccountModel


class OperatorIdentityProvider(Protocol):
    def authenticate(
        self,
        session: Session,
        *,
        email: str,
        password: str,
    ) -> HumanAccountModel: ...


def build_operator_identity_provider(settings: Settings) -> OperatorIdentityProvider:
    if settings.operator_identity_provider == "local":
        from app.services.operator_identity_local import LocalOperatorIdentityProvider

        return LocalOperatorIdentityProvider()

    raise ValueError(f"Unsupported operator identity provider: {settings.operator_identity_provider}")

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.human_account import HumanAccountModel
from app.services.admin_account_service import authenticate_admin_account


class LocalOperatorIdentityProvider:
    def authenticate(
        self,
        session: Session,
        *,
        email: str,
        password: str,
    ) -> HumanAccountModel:
        return authenticate_admin_account(
            session,
            email=email,
            password=password,
        )

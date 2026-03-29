from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.human_account import HumanAccountModel


class HumanAccountRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, model: HumanAccountModel) -> HumanAccountModel:
        self.session.add(model)
        self.session.flush()
        return model

    def get(self, account_id: str) -> HumanAccountModel | None:
        return self.session.get(HumanAccountModel, account_id)

    def get_by_email(self, email: str) -> HumanAccountModel | None:
        return (
            self.session.query(HumanAccountModel)
            .filter(HumanAccountModel.email == email)
            .one_or_none()
        )

    def list_active_owners(self) -> list[HumanAccountModel]:
        return (
            self.session.query(HumanAccountModel)
            .filter(HumanAccountModel.role == "owner")
            .filter(HumanAccountModel.status == "active")
            .all()
        )

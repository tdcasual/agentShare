from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import ConflictError
from app.orm.human_account import HumanAccountModel
from app.repositories.human_account_repo import HumanAccountRepository
from app.repositories.system_setting_repo import SystemSettingRepository
from app.services.identifiers import new_resource_id
from app.services.password_service import hash_password

BOOTSTRAP_INITIALIZED_KEY = "bootstrap.initialized"


def is_bootstrap_initialized(session: Session) -> bool:
    accounts = HumanAccountRepository(session).list_active_owners()
    if accounts:
        return True

    setting = SystemSettingRepository(session).get(BOOTSTRAP_INITIALIZED_KEY)
    return bool(setting and setting.value_json.get("initialized"))


def create_first_owner(
    session: Session,
    *,
    email: str,
    display_name: str,
    password: str,
) -> HumanAccountModel:
    account_repo = HumanAccountRepository(session)
    if is_bootstrap_initialized(session):
        raise ConflictError("Owner bootstrap is already complete")

    if account_repo.get_by_email(email) is not None:
        raise ConflictError("Account email already exists")

    account = HumanAccountModel(
        id=new_resource_id("human"),
        email=email,
        display_name=display_name,
        role="owner",
        status="active",
        password_hash=hash_password(password),
    )
    account_repo.create(account)
    SystemSettingRepository(session).set_json(
        BOOTSTRAP_INITIALIZED_KEY,
        {"initialized": True},
    )
    return account

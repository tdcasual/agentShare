from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.errors import AuthorizationError, ConflictError, NotFoundError
from app.orm.human_account import HumanAccountModel
from app.repositories.human_account_repo import HumanAccountRepository
from app.services.bootstrap_service import is_bootstrap_initialized
from app.services.identifiers import new_resource_id
from app.services.password_service import hash_password, verify_password


def authenticate_admin_account(
    session: Session,
    *,
    email: str,
    password: str,
) -> HumanAccountModel:
    if not is_bootstrap_initialized(session):
        raise ConflictError("Bootstrap setup is required before management login")

    account = HumanAccountRepository(session).get_by_email(email)
    if account is None or account.status != "active" or not verify_password(password, account.password_hash):
        raise AuthorizationError("Invalid email or password")

    account.last_login_at = datetime.now(timezone.utc)
    HumanAccountRepository(session).update(account)
    return account


def create_admin_account(
    session: Session,
    *,
    email: str,
    display_name: str,
    password: str,
    role: str,
) -> HumanAccountModel:
    repo = HumanAccountRepository(session)
    if repo.get_by_email(email) is not None:
        raise ConflictError("Account email already exists")

    account = HumanAccountModel(
        id=new_resource_id("human"),
        email=email,
        display_name=display_name,
        role=role,
        status="active",
        password_hash=hash_password(password),
    )
    repo.create(account)
    return account


def list_admin_accounts(session: Session) -> list[HumanAccountModel]:
    return HumanAccountRepository(session).list_all()


def disable_admin_account(session: Session, *, account_id: str) -> HumanAccountModel:
    repo = HumanAccountRepository(session)
    account = repo.get(account_id)
    if account is None:
        raise NotFoundError("Admin account not found")
    if account.role == "owner":
        raise ConflictError("Owner accounts cannot be disabled")

    account.status = "disabled"
    repo.update(account)
    return account

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.config import Settings
from app.orm.human_account import HumanAccountModel
from app.orm.management_session import ManagementSessionModel
from app.repositories.agent_repo import AgentRepository
from app.repositories.human_account_repo import HumanAccountRepository
from app.repositories.management_session_repo import ManagementSessionRepository
from app.schemas.sessions import ManagementSessionPayload


class ManagementSessionError(ValueError):
    """Raised when the management session token is missing, invalid, or expired."""


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def authenticate_bootstrap_key(session: Session, bootstrap_key: str) -> bool:
    repo = AgentRepository(session)
    agent = repo.find_by_api_key_hash(hash_key(bootstrap_key))
    return agent is not None and agent.id == "bootstrap" and agent.status == "active"


def build_management_session_payload(
    account: HumanAccountModel,
    settings: Settings,
) -> ManagementSessionPayload:
    now = int(time.time())
    return ManagementSessionPayload(
        sub=account.id,
        actor_id=account.id,
        actor_type="human",
        role=account.role,
        auth_method="session",
        session_id=f"session-{uuid4().hex}",
        email=account.email,
        iat=now,
        exp=now + settings.management_session_ttl_seconds,
        ver=1,
    )


def create_management_session(
    session: Session,
    settings: Settings,
    account: HumanAccountModel,
) -> ManagementSessionPayload:
    payload = build_management_session_payload(account, settings)
    repo = ManagementSessionRepository(session)
    repo.create(ManagementSessionModel(
        session_id=payload.session_id,
        actor_id=payload.actor_id,
        role=payload.role,
        issued_at=_timestamp_to_datetime(payload.iat),
        expires_at=_timestamp_to_datetime(payload.exp),
    ))
    return payload


def issue_management_session_token(
    settings: Settings,
    payload: ManagementSessionPayload | None = None,
) -> str:
    if payload is None:
        raise TypeError("Management session payload is required")
    current_payload = payload
    encoded_payload = _encode_component(
        json.dumps(current_payload.model_dump(), sort_keys=True, separators=(",", ":")).encode()
    )
    signature = hmac.new(
        settings.management_session_secret.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).digest()
    encoded_signature = _encode_component(signature)
    return f"{encoded_payload}.{encoded_signature}"


def decode_management_session_token(
    token: str,
    settings: Settings,
) -> ManagementSessionPayload:
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
    except ValueError as exc:
        raise ManagementSessionError("Malformed management session token") from exc

    expected_signature = hmac.new(
        settings.management_session_secret.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).digest()
    signature = _decode_component(encoded_signature)
    if not hmac.compare_digest(signature, expected_signature):
        raise ManagementSessionError("Invalid management session signature")

    payload_data = json.loads(_decode_component(encoded_payload))
    try:
        payload = ManagementSessionPayload.model_validate(payload_data)
    except ValidationError as exc:
        raise ManagementSessionError(str(exc)) from exc
    if int(payload.exp) <= int(time.time()):
        raise ManagementSessionError("Management session expired")
    return payload


def revoke_management_session(session: Session, session_id: str) -> None:
    repo = ManagementSessionRepository(session)
    repo.revoke(session_id)


def authenticate_management_session_token(
    token: str,
    settings: Settings,
    session: Session,
) -> ManagementSessionPayload:
    payload = decode_management_session_token(token, settings)
    record = ManagementSessionRepository(session).get(payload.session_id)
    if record is None:
        raise ManagementSessionError("Unknown management session")
    if record.revoked_at is not None:
        raise ManagementSessionError("Management session revoked")
    if _datetime_to_timestamp(record.expires_at) <= int(time.time()):
        raise ManagementSessionError("Management session expired")
    if (
        record.actor_id != payload.actor_id
        or record.role != payload.role
        or _datetime_to_timestamp(record.issued_at) != payload.iat
        or _datetime_to_timestamp(record.expires_at) != payload.exp
    ):
        raise ManagementSessionError("Management session payload does not match persisted session")
    account = HumanAccountRepository(session).get(payload.actor_id)
    if account is None or account.status != "active":
        raise ManagementSessionError("Management account is inactive")
    if account.email != payload.email or account.role != payload.role:
        raise ManagementSessionError("Management account no longer matches this session")
    return payload


def _encode_component(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _decode_component(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f"{raw}{padding}")


def _timestamp_to_datetime(timestamp: int) -> datetime:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def _datetime_to_timestamp(value: datetime) -> int:
    normalized = value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    return int(normalized.timestamp())

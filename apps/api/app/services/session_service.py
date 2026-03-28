from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.config import Settings
from app.repositories.agent_repo import AgentRepository
from app.schemas.sessions import ManagementSessionPayload


class ManagementSessionError(ValueError):
    """Raised when the management session token is missing, invalid, or expired."""


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def authenticate_bootstrap_key(session: Session, bootstrap_key: str) -> bool:
    repo = AgentRepository(session)
    agent = repo.find_by_api_key_hash(hash_key(bootstrap_key))
    return agent is not None and agent.id == "bootstrap" and agent.status == "active"


def build_management_session_payload(settings: Settings) -> ManagementSessionPayload:
    now = int(time.time())
    return ManagementSessionPayload(
        sub="management",
        actor_id="management",
        role="admin",
        actor_type="human",
        auth_method="session",
        iat=now,
        exp=now + settings.management_session_ttl_seconds,
        ver=1,
    )


def issue_management_session_token(
    settings: Settings,
    payload: ManagementSessionPayload | None = None,
) -> str:
    current_payload = payload or build_management_session_payload(settings)
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


def _encode_component(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _decode_component(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f"{raw}{padding}")

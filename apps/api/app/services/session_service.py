from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from sqlalchemy.orm import Session

from app.config import Settings
from app.repositories.agent_repo import AgentRepository


class ManagementSessionError(ValueError):
    """Raised when the management session token is missing, invalid, or expired."""


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def authenticate_bootstrap_key(session: Session, bootstrap_key: str) -> bool:
    repo = AgentRepository(session)
    agent = repo.find_by_api_key_hash(hash_key(bootstrap_key))
    return agent is not None and agent.id == "bootstrap" and agent.status == "active"


def issue_management_session_token(settings: Settings | None = None) -> str:
    current_settings = settings or Settings()
    now = int(time.time())
    payload = {
        "sub": "management",
        "role": "admin",
        "actor_type": "human",
        "iat": now,
        "exp": now + current_settings.management_session_ttl_seconds,
        "ver": 1,
    }
    encoded_payload = _encode_component(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode())
    signature = hmac.new(
        current_settings.management_session_secret.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).digest()
    encoded_signature = _encode_component(signature)
    return f"{encoded_payload}.{encoded_signature}"


def decode_management_session_token(token: str, settings: Settings | None = None) -> dict:
    current_settings = settings or Settings()
    try:
        encoded_payload, encoded_signature = token.split(".", 1)
    except ValueError as exc:
        raise ManagementSessionError("Malformed management session token") from exc

    expected_signature = hmac.new(
        current_settings.management_session_secret.encode(),
        encoded_payload.encode(),
        hashlib.sha256,
    ).digest()
    signature = _decode_component(encoded_signature)
    if not hmac.compare_digest(signature, expected_signature):
        raise ManagementSessionError("Invalid management session signature")

    payload = json.loads(_decode_component(encoded_payload))
    if int(payload.get("exp", 0)) <= int(time.time()):
        raise ManagementSessionError("Management session expired")
    return payload


def _encode_component(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _decode_component(raw: str) -> bytes:
    padding = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(f"{raw}{padding}")

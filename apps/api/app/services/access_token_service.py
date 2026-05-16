from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.errors import ConflictError, NotFoundError
from app.orm.access_token import AccessTokenModel
from app.repositories.access_token_repo import AccessTokenRepository
from app.services.identifiers import new_resource_id
from app.services.secret_backend import get_secret_backend, get_secret_backend_for_ref


logger = logging.getLogger(__name__)


def hash_access_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def mint_access_token(
    session: Session,
    *,
    subject_type: str,
    subject_id: str,
    display_name: str,
    issued_by_actor_type: str,
    issued_by_actor_id: str,
    scopes: list[str] | None = None,
    labels: dict[str, str] | None = None,
    policy: dict | None = None,
    expires_at: datetime | None = None,
    settings: Settings | None = None,
) -> tuple[AccessTokenModel, str]:
    raw_token = secrets.token_urlsafe(32)
    token_id = new_resource_id("access-token")
    backend = get_secret_backend(settings)
    _, backend_ref = backend.write_secret(raw_token, secret_id=token_id)
    model = AccessTokenModel(
        id=token_id,
        display_name=display_name,
        token_hash=hash_access_token(raw_token),
        token_prefix=raw_token[:10],
        token_secret_backend_ref=backend_ref,
        status="active",
        subject_type=subject_type,
        subject_id=subject_id,
        expires_at=expires_at,
        issued_by_actor_type=issued_by_actor_type,
        issued_by_actor_id=issued_by_actor_id,
        scopes=scopes or [],
        labels=labels or {},
        policy=policy or {},
    )
    try:
        AccessTokenRepository(session).create(model)
    except Exception:
        try:
            backend.delete_secret(token_id, backend_ref)
        except Exception:
            logger.exception(
                "Failed to clean up stored access token secret after create failure",
                extra={"token_id": token_id},
            )
        raise
    return model, raw_token


def is_access_token_active(token: AccessTokenModel) -> bool:
    if token.status != "active":
        return False
    if token.expires_at is None:
        return True
    expires_at = token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at > datetime.now(timezone.utc)


def touch_access_token(session: Session, token: AccessTokenModel) -> AccessTokenModel:
    token.last_used_at = datetime.now(timezone.utc)
    return AccessTokenRepository(session).update(token)


def revoke_access_token(session: Session, token_id: str, *, settings: Settings | None = None) -> AccessTokenModel:
    token = AccessTokenRepository(session).revoke(token_id)
    if token is None:
        raise NotFoundError("Access token not found")
    if token.token_secret_backend_ref:
        try:
            backend = get_secret_backend_for_ref(token.token_secret_backend_ref, settings)
            backend.delete_secret(token.id, token.token_secret_backend_ref)
        except Exception:
            logger.exception(
                "Failed to delete access token secret from backend during revocation",
                extra={"token_id": token_id},
            )
    return token


def list_access_tokens(session: Session) -> list[AccessTokenModel]:
    return AccessTokenRepository(session).list_all()


def reveal_access_token_secret(
    session: Session,
    token_id: str,
    *,
    settings: Settings | None = None,
) -> tuple[AccessTokenModel, str]:
    token = AccessTokenRepository(session).get(token_id)
    if token is None:
        raise NotFoundError("Access token not found")
    if not token.token_secret_backend_ref:
        raise ConflictError("Access token secret is unavailable for this token")

    backend = get_secret_backend_for_ref(token.token_secret_backend_ref, settings)
    return token, backend.read_secret(token.id, token.token_secret_backend_ref)


def serialize_access_token(model: AccessTokenModel, *, api_key: str | None = None) -> dict:
    return {
        "id": model.id,
        "display_name": model.display_name,
        "token_prefix": model.token_prefix,
        "status": model.status,
        "subject_type": model.subject_type,
        "subject_id": model.subject_id,
        "expires_at": model.expires_at,
        "issued_by_actor_type": model.issued_by_actor_type,
        "issued_by_actor_id": model.issued_by_actor_id,
        "last_used_at": model.last_used_at,
        "scopes": model.scopes or [],
        "labels": model.labels or {},
        "policy": model.policy or {},
        "completed_runs": model.completed_runs,
        "successful_runs": model.successful_runs,
        "success_rate": model.success_rate,
        "last_feedback_at": model.last_feedback_at,
        "trust_score": model.trust_score,
        "api_key": api_key,
    }

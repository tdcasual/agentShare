from datetime import datetime, timedelta, timezone

import pytest

from app.config import Settings
from app.repositories.management_session_repo import ManagementSessionRepository
from app.services.session_service import (
    ManagementSessionError,
    authenticate_management_session_token,
    build_management_session_payload,
    create_management_session,
    decode_management_session_token,
    issue_management_session_token,
    revoke_management_session,
)


def test_issue_and_decode_management_session_token_returns_typed_identity_payload():
    settings = Settings(
        management_session_secret="test-session-secret",
        management_session_ttl_seconds=600,
    )

    token = issue_management_session_token(settings)
    payload = decode_management_session_token(token, settings)

    assert payload.actor_id == "management"
    assert payload.actor_type == "human"
    assert payload.role == "admin"
    assert payload.auth_method == "session"
    assert payload.session_id
    assert payload.ver == 1
    assert payload.exp > payload.iat


def test_create_management_session_persists_record(db_session):
    settings = Settings(
        management_session_secret="test-session-secret",
        management_session_ttl_seconds=600,
    )

    payload = create_management_session(db_session, settings)
    record = ManagementSessionRepository(db_session).get(payload.session_id)

    assert record is not None
    assert record.session_id == payload.session_id
    assert record.actor_id == payload.actor_id
    assert record.role == payload.role
    assert record.revoked_at is None


def test_build_management_session_payload_respects_operator_identity_settings():
    settings = Settings(
        management_session_secret="test-session-secret",
        management_operator_id="ops.lead",
        management_operator_role="owner",
    )

    payload = build_management_session_payload(settings)

    assert payload.actor_id == "ops.lead"
    assert payload.role == "owner"
    assert payload.sub == "ops.lead"


def test_decode_management_session_token_rejects_missing_required_claims():
    settings = Settings(management_session_secret="test-session-secret")
    token = issue_management_session_token(settings)
    payload = decode_management_session_token(token, settings)

    encoded = issue_management_session_token(
        settings,
        payload=payload.model_copy(update={"actor_id": ""}),
    )

    with pytest.raises(ManagementSessionError, match="actor_id"):
        decode_management_session_token(encoded, settings)


def test_decode_management_session_token_rejects_unsupported_version():
    settings = Settings(management_session_secret="test-session-secret")
    token = issue_management_session_token(settings)
    payload = decode_management_session_token(token, settings)

    encoded = issue_management_session_token(
        settings,
        payload=payload.model_copy(update={"ver": 2}),
    )

    with pytest.raises(ManagementSessionError, match="version"):
        decode_management_session_token(encoded, settings)


def test_revoked_management_session_is_rejected(db_session):
    settings = Settings(management_session_secret="test-session-secret")
    payload = create_management_session(db_session, settings)
    token = issue_management_session_token(settings, payload=payload)

    revoke_management_session(db_session, payload.session_id)

    with pytest.raises(ManagementSessionError, match="revoked"):
        authenticate_management_session_token(token, settings, db_session)


def test_expired_management_session_record_is_rejected(db_session):
    settings = Settings(management_session_secret="test-session-secret")
    payload = create_management_session(db_session, settings)
    token = issue_management_session_token(settings, payload=payload)

    repo = ManagementSessionRepository(db_session)
    record = repo.get(payload.session_id)
    assert record is not None
    record.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    repo.update(record)

    with pytest.raises(ManagementSessionError, match="expired"):
        authenticate_management_session_token(token, settings, db_session)


def test_management_session_helpers_require_explicit_settings():
    with pytest.raises(TypeError):
        build_management_session_payload()

    with pytest.raises(TypeError):
        issue_management_session_token()

    with pytest.raises(TypeError):
        decode_management_session_token("signed-token")

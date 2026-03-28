import pytest

from app.config import Settings
from app.services.session_service import (
    ManagementSessionError,
    build_management_session_payload,
    decode_management_session_token,
    issue_management_session_token,
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


def test_management_session_helpers_require_explicit_settings():
    with pytest.raises(TypeError):
        build_management_session_payload()

    with pytest.raises(TypeError):
        issue_management_session_token()

    with pytest.raises(TypeError):
        decode_management_session_token("signed-token")

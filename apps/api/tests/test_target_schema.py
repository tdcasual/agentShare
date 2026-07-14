from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.orm import (
    AdminSession,
    Agent,
    AgentToken,
    AuditLog,
    Base,
    ManagementToken,
    Secret,
    TokenSecretGrant,
    User,
)


@contextmanager
def _session() -> Iterator[Session]:
    engine = create_engine("sqlite:///:memory:")
    try:
        Base.metadata.create_all(engine)
        with Session(engine) as session:
            yield session
    finally:
        engine.dispose()


def test_database_enforces_single_admin_user() -> None:
    with _session() as session:
        session.add(User(email="first@example.com", password_hash="hash-1"))
        session.commit()

        session.add(User(email="second@example.com", password_hash="hash-2"))
        with pytest.raises(IntegrityError):
            session.commit()


def test_agent_can_have_multiple_independently_scoped_tokens() -> None:
    with _session() as session:
        admin = User(email="admin@example.com", password_hash="hash")
        session.add(admin)
        session.flush()
        agent = Agent(user_id=admin.id, name="deploy-agent")
        secret_a = Secret(
            user_id=admin.id,
            type="api_key",
            name="github",
            value_encrypted="cipher-a",
        )
        secret_b = Secret(
            user_id=admin.id,
            type="password",
            name="database",
            value_encrypted="cipher-b",
        )
        session.add_all([agent, secret_a, secret_b])
        session.flush()

        token_a = AgentToken(
            user_id=admin.id,
            agent_id=agent.id,
            key_hash="hash-a",
            key_prefix="vg_a",
            name="production",
        )
        token_b = AgentToken(
            user_id=admin.id,
            agent_id=agent.id,
            key_hash="hash-b",
            key_prefix="vg_b",
            name="testing",
        )
        session.add_all([token_a, token_b])
        session.flush()
        session.add_all([
            TokenSecretGrant(token_id=token_a.id, secret_id=secret_a.id),
            TokenSecretGrant(token_id=token_b.id, secret_id=secret_b.id),
        ])
        session.commit()

        assert {token.name for token in agent.tokens} == {"production", "testing"}
        assert {grant.secret_id for grant in token_a.grants} == {secret_a.id}
        assert {grant.secret_id for grant in token_b.grants} == {secret_b.id}


def test_duplicate_token_secret_grant_is_rejected() -> None:
    with _session() as session:
        admin = User(email="admin@example.com", password_hash="hash")
        session.add(admin)
        session.flush()
        agent = Agent(user_id=admin.id, name="agent")
        secret = Secret(
            user_id=admin.id,
            type="api_key",
            name="key",
            value_encrypted="cipher",
        )
        session.add_all([agent, secret])
        session.flush()
        token = AgentToken(
            user_id=admin.id,
            agent_id=agent.id,
            key_hash="hash",
            key_prefix="vg_key",
            name="default",
        )
        session.add(token)
        session.flush()
        session.add_all([
            TokenSecretGrant(token_id=token.id, secret_id=secret.id),
            TokenSecretGrant(token_id=token.id, secret_id=secret.id),
        ])

        with pytest.raises(IntegrityError):
            session.commit()


def test_admin_session_and_management_token_enforce_expiry_and_revocation() -> None:
    now = datetime.now(UTC)
    with _session() as session:
        admin = User(email="admin@example.com", password_hash="hash")
        session.add(admin)
        session.flush()
        admin_session = AdminSession(
            user_id=admin.id,
            key_hash="session-hash",
            key_prefix="vgs_test",
            expires_at=now + timedelta(hours=1),
        )
        management_token = ManagementToken(
            user_id=admin.id,
            key_hash="management-hash",
            key_prefix="vgm_test",
            name="automation",
            expires_at=now + timedelta(hours=1),
        )
        session.add_all([admin_session, management_token])
        session.commit()

        assert admin_session.is_valid(now)
        assert management_token.is_valid(now)

        admin_session.revoked_at = now
        management_token.revoked_at = now

        assert not admin_session.is_valid(now)
        assert not management_token.is_valid(now)


def test_audit_log_keeps_structured_actor_and_resource_snapshots() -> None:
    with _session() as session:
        log = AuditLog(
            actor_type="agent_token",
            actor_id="token-id",
            actor_label="vg_example / deploy-agent",
            resource_type="secret",
            resource_id="secret-id",
            resource_label="production/database",
            action="secret.value.read",
            result="denied",
            reason="grant_missing",
            request_id="request-id",
        )
        session.add(log)
        session.commit()

        assert log.actor_type == "agent_token"
        assert log.actor_id == "token-id"
        assert log.actor_label == "vg_example / deploy-agent"
        assert log.resource_type == "secret"
        assert log.resource_id == "secret-id"
        assert log.resource_label == "production/database"
        assert log.reason == "grant_missing"
        assert log.request_id == "request-id"


def test_audit_token_prefix_accepts_current_agent_token_prefixes() -> None:
    audit_prefix_length = AuditLog.__table__.c.token_prefix.type.length
    token_prefix_length = AgentToken.__table__.c.key_prefix.type.length

    assert audit_prefix_length == token_prefix_length == 16

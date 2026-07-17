from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.modules.admin_auth.service import AdminPrincipal
from app.modules.agents.routes import list_agents
from app.modules.audit.routes import audit_stats, list_audit_actions, list_audit_logs
from app.modules.audit.service import AUDIT_ACTIONS
from app.modules.tokens.routes import get_grants, replace_grants
from app.modules.tokens.schemas import GrantReplace
from app.modules.tokens.service import owned_token
from app.orm import Agent, AgentToken, AuditLog, User


def _principal() -> AdminPrincipal:
    user = User(id="admin-id", email="admin@example.com", password_hash="hash")
    return AdminPrincipal(user=user, auth_type="session", credential_id="session-id")


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "PUT",
            "path": "/api/admin/tokens/token-id/grants",
            "headers": [],
            "client": ("127.0.0.1", 1234),
        }
    )


def test_list_agents_directly_applies_status_and_pagination():
    now = datetime.now(UTC)
    agent = Agent(
        id="agent-id",
        user_id="admin-id",
        name="worker",
        description=None,
        status="disabled",
        created_at=now,
        updated_at=now,
    )
    db = AsyncMock()
    db.scalar.return_value = 1
    db.scalars.return_value = [agent]

    result = asyncio.run(
        list_agents(
            limit=25,
            offset=50,
            status_filter="disabled",
            principal=_principal(),
            db=db,
        )
    )

    assert result == {
        "items": [
            {
                "id": "agent-id",
                "name": "worker",
                "description": None,
                "status": "disabled",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        ],
        "total": 1,
        "limit": 25,
        "offset": 50,
    }
    db.scalar.assert_awaited_once()
    db.scalars.assert_awaited_once()

    with pytest.raises(HTTPException) as raised:
        asyncio.run(
            list_agents(
                limit=25,
                offset=0,
                status_filter="unknown",
                principal=_principal(),
                db=AsyncMock(),
            )
        )
    assert raised.value.status_code == 422


def test_audit_queries_directly_apply_filters_pagination_and_global_stats():
    now = datetime.now(UTC)
    log = AuditLog(
        id="audit-id",
        actor_type="session",
        actor_id="session-id",
        actor_label="admin@example.com",
        resource_type="secret",
        resource_id="secret-id",
        resource_label="database",
        action="secret.value.read",
        result="success",
        reason=None,
        request_id="request-id",
        created_at=now,
    )
    list_db = AsyncMock()
    list_db.scalar.return_value = 1
    list_db.scalars.return_value = [log]

    page = asyncio.run(
        list_audit_logs(
            result="success",
            action="secret.value.read",
            actor_type="agent_token",
            actor_id="token-id",
            actor_search="deploy",
            resource_type="secret",
            resource_id="secret-id",
            resource_search="database",
            created_from=datetime(2026, 1, 1, tzinfo=UTC),
            created_to=datetime(2026, 12, 31, tzinfo=UTC),
            limit=10,
            offset=20,
            _principal=_principal(),
            db=list_db,
        )
    )

    assert page["total"] == 1
    assert page["limit"] == 10
    assert page["offset"] == 20
    assert page["items"][0] == {
        "id": "audit-id",
        "actor_type": "session",
        "actor_id": "session-id",
        "actor_label": "admin@example.com",
        "resource_type": "secret",
        "resource_id": "secret-id",
        "resource_label": "database",
        "action": "secret.value.read",
        "result": "success",
        "reason": None,
        "request_id": "request-id",
        "created_at": now.isoformat(),
    }

    stats_db = AsyncMock()
    stats_db.scalar.side_effect = [9, 3, 2, 4]
    stats = asyncio.run(
        audit_stats(
            _principal(),
            stats_db,
            created_from=datetime(2026, 1, 1, tzinfo=UTC),
            created_to=datetime(2026, 12, 31, tzinfo=UTC),
        )
    )
    assert stats == {"total": 9, "granted": 3, "denied": 2, "value_reads": 4}
    assert asyncio.run(list_audit_actions(_principal())) == {"items": list(AUDIT_ACTIONS)}


def test_token_grant_queries_enforce_ownership_and_commit_empty_grants():
    token = AgentToken(
        id="token-id",
        user_id="admin-id",
        agent_id="agent-id",
        key_hash="hash",
        key_prefix="vg_prefix",
        name="runtime",
    )
    found = MagicMock()
    found.scalar_one_or_none.return_value = token

    lookup_db = MagicMock()
    lookup_db.execute = AsyncMock(return_value=found)
    assert asyncio.run(owned_token(lookup_db, "admin-id", "token-id")) is token

    missing = MagicMock()
    missing.scalar_one_or_none.return_value = None
    missing_db = MagicMock()
    missing_db.execute = AsyncMock(return_value=missing)
    with pytest.raises(HTTPException) as raised:
        asyncio.run(owned_token(missing_db, "admin-id", "missing"))
    assert raised.value.status_code == 404

    grants_db = MagicMock()
    grants_db.execute = AsyncMock(return_value=found)
    grants_db.scalars = AsyncMock(return_value=["secret-a", "secret-b"])
    grants = asyncio.run(get_grants("token-id", _principal(), grants_db))
    assert grants == {"secret_ids": ["secret-a", "secret-b"]}

    replace_db = MagicMock()
    replace_db.execute = AsyncMock(side_effect=[found, MagicMock()])
    replace_db.commit = AsyncMock()
    result = asyncio.run(
        replace_grants(
            "token-id",
            GrantReplace(secret_ids=[]),
            _request(),
            _principal(),
            replace_db,
        )
    )
    assert result == {"secret_ids": []}
    assert replace_db.execute.await_count == 2
    replace_db.add_all.assert_called_once_with([])
    replace_db.commit.assert_awaited_once()

from __future__ import annotations

from pathlib import Path

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

from alembic import command

API_ROOT = Path(__file__).resolve().parents[1]


def _alembic_config(database_url: str) -> Config:
    config = Config(str(API_ROOT / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_upgrade_preserves_existing_secrets_tokens_scopes_and_audit(tmp_path, monkeypatch) -> None:
    database_url = f"sqlite:///{tmp_path / 'migration.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    config = _alembic_config(database_url)
    command.upgrade(config, "20260613_01")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, password_hash) "
                "VALUES ('admin-id', 'admin@example.com', 'password-hash')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO secrets "
                "(id, user_id, type, name, value_encrypted, tags, metadata) "
                "VALUES ('secret-id', 'admin-id', 'api_key', 'github', "
                "'ciphertext', '[]', '{}')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO tokens "
                "(id, user_id, key_hash, key_prefix, name, status) "
                "VALUES ('token-id', 'admin-id', 'token-hash', 'vg_old', "
                "'legacy automation', 'active')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO scopes (id, token_id, secret_id) "
                "VALUES ('scope-id', 'token-id', 'secret-id')"
            )
        )
        connection.execute(
            text(
                "INSERT INTO audit_logs "
                "(id, token_id, token_prefix, secret_id, action, result, metadata) "
                "VALUES ('audit-id', 'token-id', 'vg_old', 'secret-id', "
                "'read', 'success', '{}')"
            )
        )

    command.upgrade(config, "head")

    table_names = set(inspect(engine).get_table_names())
    assert "tokens" not in table_names
    assert "scopes" not in table_names
    assert {
        "admin_sessions",
        "agents",
        "agent_tokens",
        "management_tokens",
        "token_secret_grants",
    }.issubset(table_names)
    audit_columns = {column["name"]: column for column in inspect(engine).get_columns("audit_logs")}
    assert audit_columns["token_prefix"]["type"].length == 16

    with engine.connect() as connection:
        secret = connection.execute(
            text("SELECT id, user_id, name, value_encrypted FROM secrets")
        ).mappings().one()
        token = connection.execute(
            text("SELECT id, user_id, agent_id, key_hash, name FROM agent_tokens")
        ).mappings().one()
        grant = connection.execute(
            text("SELECT id, token_id, secret_id FROM token_secret_grants")
        ).mappings().one()
        agent = connection.execute(
            text("SELECT id, user_id, name, status FROM agents")
        ).mappings().one()
        audit = connection.execute(
            text(
                "SELECT actor_type, actor_id, actor_label, resource_type, "
                "resource_id, resource_label FROM audit_logs"
            )
        ).mappings().one()

    assert dict(secret) == {
        "id": "secret-id",
        "user_id": "admin-id",
        "name": "github",
        "value_encrypted": "ciphertext",
    }
    assert token["id"] == "token-id"
    assert token["user_id"] == "admin-id"
    assert token["agent_id"] == agent["id"]
    assert token["key_hash"] == "token-hash"
    assert token["name"] == "legacy automation"
    assert dict(grant) == {
        "id": "scope-id",
        "token_id": "token-id",
        "secret_id": "secret-id",
    }
    assert agent["user_id"] == "admin-id"
    assert agent["name"] == "Migrated Agent"
    assert agent["status"] == "active"
    assert audit["actor_type"] == "agent_token"
    assert audit["actor_id"] == "token-id"
    assert audit["actor_label"] == "vg_old"
    assert audit["resource_type"] == "secret"
    assert audit["resource_id"] == "secret-id"
    assert audit["resource_label"] == "secret-id"

    engine.dispose()


def test_migrated_schema_matches_orm_metadata(tmp_path, monkeypatch) -> None:
    database_url = f"sqlite:///{tmp_path / 'schema-check.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    config = _alembic_config(database_url)

    command.upgrade(config, "head")

    command.check(config)


def test_spaces_migration_downgrade_drops_unrepresentable_agent_idempotency_records(
    tmp_path, monkeypatch
) -> None:
    database_url = f"sqlite:///{tmp_path / 'spaces-round-trip.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    config = _alembic_config(database_url)
    command.upgrade(config, "20260720_01")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, password_hash) "
                "VALUES ('admin-id', 'admin@example.com', 'password-hash')"
            )
        )

    command.upgrade(config, "20260730_01")
    with engine.begin() as connection:
        for record_id, principal_type, principal_id, key in (
            ("admin-record", "admin", "admin-id", "admin-key"),
            ("agent-record-a", "agent_token", "token-a", "shared-key"),
            ("agent-record-b", "agent_token", "token-b", "shared-key"),
        ):
            connection.execute(
                text(
                    "INSERT INTO idempotency_records "
                    "(id, user_id, key, request_hash, status_code, response_encrypted, "
                    "principal_type, principal_id) VALUES "
                    "(:id, 'admin-id', :key, :request_hash, 201, 'ciphertext', "
                    ":principal_type, :principal_id)"
                ),
                {
                    "id": record_id,
                    "key": key,
                    "request_hash": record_id.ljust(64, "0"),
                    "principal_type": principal_type,
                    "principal_id": principal_id,
                },
            )

    command.downgrade(config, "20260720_01")

    columns = {column["name"] for column in inspect(engine).get_columns("idempotency_records")}
    assert "principal_type" not in columns
    assert "principal_id" not in columns
    with engine.connect() as connection:
        records = connection.execute(
            text("SELECT id, key FROM idempotency_records ORDER BY id")
        ).all()
    assert records == [("admin-record", "admin-key")]
    engine.dispose()


def test_upgrade_dedupes_names_before_adding_unique_indexes(tmp_path, monkeypatch) -> None:
    database_url = f"sqlite:///{tmp_path / 'dedupe.db'}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    config = _alembic_config(database_url)
    command.upgrade(config, "20260715_01")

    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (id, email, password_hash) "
                "VALUES ('admin-id', 'admin@example.com', 'password-hash')"
            )
        )
        for agent_id, name in (("agent-a", "deploy"), ("agent-b", "backup")):
            connection.execute(
                text("INSERT INTO agents (id, user_id, name, status) VALUES (:id, 'admin-id', :name, 'active')"),
                {"id": agent_id, "name": name},
            )
        for secret_id, name, created_at in (
            ("secret-1", "github", "2026-01-01 00:00:00"),
            ("secret-2", "github", "2026-01-02 00:00:00"),
            ("secret-3", "solo", "2026-01-01 00:00:00"),
        ):
            connection.execute(
                text(
                    "INSERT INTO secrets (id, user_id, type, name, value_encrypted, tags, metadata, created_at) "
                    "VALUES (:id, 'admin-id', 'api_key', :name, 'ciphertext', '[]', '{}', :created_at)"
                ),
                {"id": secret_id, "name": name, "created_at": created_at},
            )
        for token_id, agent_id, name, created_at in (
            ("token-1", "agent-a", "primary", "2026-01-01 00:00:00"),
            ("token-2", "agent-a", "primary", "2026-01-02 00:00:00"),
            ("token-3", "agent-b", "primary", "2026-01-01 00:00:00"),
        ):
            connection.execute(
                text(
                    "INSERT INTO agent_tokens (id, user_id, agent_id, key_hash, key_prefix, name, status, created_at) "
                    "VALUES (:id, 'admin-id', :agent_id, :key_hash, 'vg_abcd', :name, 'active', :created_at)"
                ),
                {"id": token_id, "agent_id": agent_id, "key_hash": f"hash-{token_id}", "name": name, "created_at": created_at},
            )

    command.upgrade(config, "head")

    # The earliest-created row of each duplicate group keeps the original name.
    with engine.connect() as connection:
        secrets = connection.execute(text("SELECT id, name FROM secrets ORDER BY id")).all()
        tokens = connection.execute(text("SELECT id, name FROM agent_tokens ORDER BY id")).all()
    assert dict(secrets) == {
        "secret-1": "github",
        "secret-2": "github (2)",
        "secret-3": "solo",
    }
    assert dict(tokens) == {
        "token-1": "primary",
        "token-2": "primary (2)",
        "token-3": "primary",  # different agent: untouched
    }

    indexes = {index["name"]: index for index in inspect(engine).get_indexes("secrets")}
    assert indexes["uq_secrets_name"]["column_names"] == ["name"]
    assert indexes["uq_secrets_name"]["unique"]
    token_indexes = {index["name"]: index for index in inspect(engine).get_indexes("agent_tokens")}
    assert token_indexes["uq_agent_tokens_agent_id_name"]["column_names"] == ["agent_id", "name"]
    assert token_indexes["uq_agent_tokens_agent_id_name"]["unique"]

    # The unique index rejects new duplicates.
    with pytest.raises(IntegrityError), engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO secrets (id, user_id, type, name, value_encrypted, tags, metadata) "
                "VALUES ('secret-4', 'admin-id', 'api_key', 'github', 'ciphertext', '[]', '{}')"
            )
        )

    engine.dispose()

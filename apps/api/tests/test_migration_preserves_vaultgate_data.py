from __future__ import annotations

from pathlib import Path

from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

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

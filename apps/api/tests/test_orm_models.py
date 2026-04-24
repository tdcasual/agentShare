from sqlalchemy import inspect

from app.db import engine
from app.orm.base import Base


def test_all_tables_created():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    expected = [
        "secrets",
        "capabilities",
        "openclaw_agents",
        "openclaw_sessions",
        "openclaw_workbench_sessions",
        "openclaw_workbench_messages",
        "access_tokens",
        "tasks",
        "runs",
        "playbooks",
        "audit_events",
    ]
    for name in expected:
        assert name in table_names, f"Table {name} not found"


def test_runtime_agent_tables_match_openclaw_and_access_token_schema():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    openclaw_agent_columns = [c["name"] for c in inspector.get_columns("openclaw_agents")]
    assert "name" in openclaw_agent_columns
    assert "status" in openclaw_agent_columns
    assert "workspace_root" in openclaw_agent_columns

    openclaw_session_columns = [c["name"] for c in inspector.get_columns("openclaw_sessions")]
    assert "session_key" in openclaw_session_columns
    assert "agent_id" in openclaw_session_columns

    workbench_session_columns = [c["name"] for c in inspector.get_columns("openclaw_workbench_sessions")]
    assert "capability_id" in workbench_session_columns
    assert "last_message_at" in workbench_session_columns

    workbench_message_columns = [c["name"] for c in inspector.get_columns("openclaw_workbench_messages")]
    assert "session_id" in workbench_message_columns
    assert "message_metadata" in workbench_message_columns

    access_token_columns = [c["name"] for c in inspector.get_columns("access_tokens")]
    assert "token_hash" in access_token_columns
    assert "token_prefix" in access_token_columns
    assert "subject_id" in access_token_columns


def test_capability_model_has_adapter_fields():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("capabilities")]
    assert "adapter_type" in columns
    assert "adapter_config" in columns

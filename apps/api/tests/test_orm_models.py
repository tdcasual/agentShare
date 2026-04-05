from sqlalchemy import inspect

from app.db import engine
from app.orm.base import Base


def test_all_tables_created():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    expected = ["secrets", "capabilities", "agents", "tasks", "runs", "playbooks", "audit_events"]
    for name in expected:
        assert name in table_names, f"Table {name} not found"


def test_agent_model_has_api_key_hash_column():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("agents")]
    assert "api_key_hash" in columns
    assert "name" in columns
    assert "status" in columns


def test_capability_model_has_adapter_fields():
    Base.metadata.create_all(engine)
    inspector = inspect(engine)
    columns = [c["name"] for c in inspector.get_columns("capabilities")]
    assert "adapter_type" in columns
    assert "adapter_config" in columns

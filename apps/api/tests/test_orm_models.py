from sqlalchemy import inspect

from app.db import SessionLocal, engine
from app.orm.base import Base
from app.orm.secret import SecretModel
from app.orm.capability import CapabilityModel
from app.orm.agent import AgentIdentityModel
from app.orm.task import TaskModel
from app.orm.run import RunModel
from app.orm.playbook import PlaybookModel
from app.orm.audit_event import AuditEventModel


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

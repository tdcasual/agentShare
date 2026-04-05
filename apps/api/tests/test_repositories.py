import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.repositories as repositories
from app.orm.base import Base
from app.orm.secret import SecretModel
from app.orm.agent import AgentIdentityModel
from app.orm.audit_event import AuditEventModel
from app.orm.event import EventModel
from app.orm.task import TaskModel
from app.repositories.secret_repo import SecretRepository
from app.repositories.agent_repo import AgentRepository
from app.repositories.audit_repo import AuditEventRepository
from app.repositories.event_repo import EventRepository
from app.repositories.task_repo import TaskRepository


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session_ = sessionmaker(bind=engine, expire_on_commit=False)
    session = Session_()
    yield session
    session.close()


# --- SecretRepository ---

def test_secret_repo_create_and_get(db_session: Session):
    repo = SecretRepository(db_session)
    model = SecretModel(
        id="secret-1", display_name="My Key", kind="api_token",
        scope={}, backend_ref="mem:secret-1", created_by="human",
    )
    created = repo.create(model)
    assert created.id == "secret-1"
    fetched = repo.get("secret-1")
    assert fetched is not None
    assert fetched.display_name == "My Key"


def test_secret_repo_list(db_session: Session):
    repo = SecretRepository(db_session)
    repo.create(SecretModel(id="s1", display_name="A", kind="api_token", scope={}, backend_ref="mem:s1", created_by="human"))
    repo.create(SecretModel(id="s2", display_name="B", kind="api_token", scope={}, backend_ref="mem:s2", created_by="human"))
    assert len(repo.list_all()) == 2


# --- AgentRepository ---

def test_agent_repo_find_bootstrap_by_api_key_hash(db_session: Session):
    repo = AgentRepository(db_session)
    repo.create(AgentIdentityModel(
        id="bootstrap", name="Bootstrap", api_key_hash="hash123",
        allowed_capability_ids=[], allowed_task_types=[], risk_tier="medium",
    ))
    found = repo.find_bootstrap_by_api_key_hash("hash123")
    assert found is not None
    assert found.name == "Bootstrap"
    assert repo.find_bootstrap_by_api_key_hash("wrong") is None


# --- TaskRepository ---

def test_task_repo_update_status(db_session: Session):
    repo = TaskRepository(db_session)
    repo.create(TaskModel(
        id="task-1", title="Do thing", task_type="config_sync",
        input={}, required_capability_ids=[], status="pending",
    ))
    task = repo.get("task-1")
    task.status = "claimed"
    task.claimed_by = "agent-1"
    repo.update(task)
    refreshed = repo.get("task-1")
    assert refreshed.status == "claimed"
    assert refreshed.claimed_by == "agent-1"


# --- AuditEventRepository ---

def test_audit_repo_create_auto_id(db_session: Session):
    repo = AuditEventRepository(db_session)
    evt = AuditEventModel(event_type="test_event", payload={"key": "val"})
    created = repo.create(evt)
    assert created.id is not None
    assert created.id >= 1


def test_repositories_package_exports_current_repository_facade():
    assert hasattr(repositories, "AgentTokenRepository")
    assert hasattr(repositories, "CatalogReleaseRepository")
    assert hasattr(repositories, "EventRepository")
    assert hasattr(repositories, "ManagementSessionRepository")
    assert hasattr(repositories, "PendingSecretMaterialRepository")
    assert hasattr(repositories, "TokenFeedbackRepository")
    assert hasattr(repositories, "SpaceRepository")
    assert hasattr(repositories, "TaskTargetRepository")


def test_event_repo_mark_read_sets_timestamp(db_session: Session):
    repo = EventRepository(db_session)
    event = repo.create(EventModel(
        id="event-1",
        event_type="task_completed",
        actor_type="agent",
        actor_id="agent-1",
        subject_type="task",
        subject_id="task-1",
        summary="done",
    ))

    updated = repo.mark_read(event.id)

    assert updated is not None
    assert updated.read_at is not None

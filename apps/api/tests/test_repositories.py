import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.repositories as repositories
from app.orm.base import Base
from app.orm.secret import SecretModel
from app.orm.agent import AgentIdentityModel
from app.orm.audit_event import AuditEventModel
from app.orm.event import EventModel
from app.orm.openclaw_agent import OpenClawAgentModel
from app.orm.openclaw_dream_run import OpenClawDreamRunModel
from app.orm.openclaw_dream_step import OpenClawDreamStepModel
from app.orm.openclaw_memory_note import OpenClawMemoryNoteModel
from app.orm.openclaw_agent_file import OpenClawAgentFileModel
from app.orm.openclaw_session import OpenClawSessionModel
from app.orm.openclaw_tool_binding import OpenClawToolBindingModel
from app.orm.task import TaskModel
from app.repositories.secret_repo import SecretRepository
from app.repositories.agent_repo import AgentRepository
from app.repositories.audit_repo import AuditEventRepository
from app.repositories.event_repo import EventRepository
from app.repositories.openclaw_agent_file_repo import OpenClawAgentFileRepository
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.repositories.openclaw_dream_run_repo import OpenClawDreamRunRepository
from app.repositories.openclaw_dream_step_repo import OpenClawDreamStepRepository
from app.repositories.openclaw_memory_repo import OpenClawMemoryRepository
from app.repositories.openclaw_session_repo import OpenClawSessionRepository
from app.repositories.task_repo import TaskRepository
from app.services.openclaw_session_key_service import hash_openclaw_session_key


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


def test_openclaw_agent_repo_create_and_list(db_session: Session):
    repo = OpenClawAgentRepository(db_session)
    repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-1",
            name="OpenClaw Agent One",
            workspace_root="/workspace/openclaw-agent-1",
            agent_dir=".openclaw/agents/openclaw-agent-1",
        )
    )

    listed = repo.list_all()

    assert len(listed) == 1
    assert listed[0].workspace_root == "/workspace/openclaw-agent-1"


def test_openclaw_agent_file_repo_upserts_workspace_file_content(db_session: Session):
    agent_repo = OpenClawAgentRepository(db_session)
    agent_repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-2",
            name="Workspace Agent",
            workspace_root="/workspace/openclaw-agent-2",
            agent_dir=".openclaw/agents/openclaw-agent-2",
        )
    )
    repo = OpenClawAgentFileRepository(db_session)

    repo.upsert(
        OpenClawAgentFileModel(
            agent_id="openclaw-agent-2",
            file_name="AGENTS.md",
            content="# Workspace Agent\n",
        )
    )

    listed = repo.list_for_agent("openclaw-agent-2")

    assert len(listed) == 1
    assert listed[0].file_name == "AGENTS.md"
    assert listed[0].content == "# Workspace Agent\n"


def test_openclaw_session_repo_lists_sessions_for_agent(db_session: Session):
    agent_repo = OpenClawAgentRepository(db_session)
    agent_repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-3",
            name="Session Agent",
            workspace_root="/workspace/openclaw-agent-3",
            agent_dir=".openclaw/agents/openclaw-agent-3",
        )
    )
    repo = OpenClawSessionRepository(db_session)
    repo.create(
        OpenClawSessionModel(
            id="session-1",
            agent_id="openclaw-agent-3",
            session_key=hash_openclaw_session_key("session-key-1"),
            display_name="Primary Session",
            channel="chat",
        )
    )

    listed = repo.list_for_agent("openclaw-agent-3")

    assert len(listed) == 1
    assert repo.find_by_session_key("session-key-1") is not None


def test_openclaw_dream_run_repo_filters_by_agent_and_status(db_session: Session):
    agent_repo = OpenClawAgentRepository(db_session)
    agent_repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-5",
            name="Dream Agent",
            workspace_root="/workspace/openclaw-agent-5",
            agent_dir=".openclaw/agents/openclaw-agent-5",
            dream_policy={"enabled": True, "max_steps_per_run": 3},
        )
    )
    session_repo = OpenClawSessionRepository(db_session)
    session_repo.create(
        OpenClawSessionModel(
            id="dream-session-1",
            agent_id="openclaw-agent-5",
            session_key=hash_openclaw_session_key("dream-session-key-1"),
            display_name="Dream Session",
            channel="chat",
        )
    )
    repo = OpenClawDreamRunRepository(db_session)
    repo.create(
            OpenClawDreamRunModel(
                id="dream-run-1",
                agent_id="openclaw-agent-5",
                session_id="dream-session-1",
                objective="Check drift",
                status="active",
                step_budget=3,
                started_by_actor_id="openclaw-agent-5",
            )
        )

    listed = repo.list_filtered(agent_id="openclaw-agent-5", status="active")

    assert [item.id for item in listed] == ["dream-run-1"]


def test_openclaw_dream_step_repo_records_step_types_and_indexes(db_session: Session):
    agent_repo = OpenClawAgentRepository(db_session)
    agent_repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-6",
            name="Dream Step Agent",
            workspace_root="/workspace/openclaw-agent-6",
            agent_dir=".openclaw/agents/openclaw-agent-6",
            dream_policy={"enabled": True, "max_steps_per_run": 3},
        )
    )
    session_repo = OpenClawSessionRepository(db_session)
    session_repo.create(
        OpenClawSessionModel(
            id="dream-session-2",
            agent_id="openclaw-agent-6",
            session_key=hash_openclaw_session_key("dream-session-key-2"),
            display_name="Dream Step Session",
            channel="chat",
        )
    )
    run_repo = OpenClawDreamRunRepository(db_session)
    run_repo.create(
            OpenClawDreamRunModel(
                id="dream-run-2",
                agent_id="openclaw-agent-6",
                session_id="dream-session-2",
                objective="Plan and reflect",
                status="active",
                step_budget=3,
                started_by_actor_id="openclaw-agent-6",
            )
        )
    repo = OpenClawDreamStepRepository(db_session)
    repo.create(
        OpenClawDreamStepModel(
            id="dream-step-1",
            run_id="dream-run-2",
            step_index=1,
            step_type="plan",
            status="completed",
            input_payload={"prompt": "plan"},
            output_payload={"summary": "inspect repo"},
            token_usage={"input": 12, "output": 8},
        )
    )

    listed = repo.list_for_run("dream-run-2")

    assert len(listed) == 1
    assert listed[0].step_type == "plan"
    assert listed[0].step_index == 1


def test_openclaw_memory_repo_searches_by_scope_tag_and_query(db_session: Session):
    agent_repo = OpenClawAgentRepository(db_session)
    agent_repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-7",
            name="Memory Agent",
            workspace_root="/workspace/openclaw-agent-7",
            agent_dir=".openclaw/agents/openclaw-agent-7",
            dream_policy={"enabled": True, "allow_memory_write": True},
        )
    )
    repo = OpenClawMemoryRepository(db_session)
    repo.create(
        OpenClawMemoryNoteModel(
            id="memory-1",
            agent_id="openclaw-agent-7",
            session_id=None,
            run_id=None,
            scope="agent",
            kind="working_note",
            importance="medium",
            tags=["config", "drift"],
            content="Drift usually begins in the staging overlay.",
        )
    )

    listed = repo.search(agent_id="openclaw-agent-7", scope="agent", tag="config", query="overlay")

    assert [item.id for item in listed] == ["memory-1"]


def test_openclaw_tool_binding_model_persists_unique_name_per_agent(db_session: Session):
    agent_repo = OpenClawAgentRepository(db_session)
    agent_repo.create(
        OpenClawAgentModel(
            id="openclaw-agent-4",
            name="Binding Agent",
            workspace_root="/workspace/openclaw-agent-4",
            agent_dir=".openclaw/agents/openclaw-agent-4",
        )
    )
    db_session.add(
        OpenClawToolBindingModel(
            id="binding-1",
            agent_id="openclaw-agent-4",
            name="tasks.list",
            binding_kind="control_plane_tool",
            binding_target="tasks.list",
            approval_mode="auto",
            enabled=True,
        )
    )
    db_session.commit()

    binding = db_session.get(OpenClawToolBindingModel, "binding-1")

    assert binding is not None
    assert binding.name == "tasks.list"


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
    assert hasattr(repositories, "OpenClawAgentRepository")
    assert hasattr(repositories, "OpenClawAgentFileRepository")
    assert hasattr(repositories, "OpenClawDreamRunRepository")
    assert hasattr(repositories, "OpenClawDreamStepRepository")
    assert hasattr(repositories, "OpenClawMemoryRepository")
    assert hasattr(repositories, "OpenClawSessionRepository")
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

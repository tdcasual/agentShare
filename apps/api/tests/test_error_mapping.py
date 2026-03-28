import pytest

from app.errors import AuthorizationError, ConflictError, NotFoundError
from app.models.agent import AgentIdentity
from app.orm.task import TaskModel
from app.repositories.task_repo import TaskRepository
from app.services.capability_service import get_capability
from app.services.playbook_service import get_playbook
from app.services.task_service import claim_task, complete_task


def _agent() -> AgentIdentity:
    return AgentIdentity(
        id="test-agent",
        name="Test Agent",
        issuer="local",
        auth_method="api_key",
        allowed_capability_ids=[],
        allowed_task_types=["config_sync", "account_read", "prompt_run"],
        risk_tier="medium",
    )


def test_claim_task_service_raises_not_found_error(db_session):
    with pytest.raises(NotFoundError, match="Task not found"):
        claim_task(db_session, "task-missing", _agent())


def test_claim_task_service_raises_conflict_error_for_non_pending_task(db_session):
    TaskRepository(db_session).create(TaskModel(
        id="task-existing",
        title="Claimed task",
        task_type="config_sync",
        status="claimed",
        claimed_by="other-agent",
    ))
    db_session.flush()

    with pytest.raises(ConflictError, match="Task is not claimable"):
        claim_task(db_session, "task-existing", _agent())


def test_complete_task_service_raises_authorization_error_for_wrong_agent(db_session):
    TaskRepository(db_session).create(TaskModel(
        id="task-claimed",
        title="Claimed task",
        task_type="config_sync",
        status="claimed",
        claimed_by="other-agent",
    ))
    db_session.flush()

    with pytest.raises(AuthorizationError, match="Task is not claimed by this agent"):
        complete_task(
            db_session,
            "task-claimed",
            _agent(),
            result_summary="done",
            output_payload={"ok": True},
        )


def test_capability_service_raises_not_found_error(db_session):
    with pytest.raises(NotFoundError, match="Capability not found"):
        get_capability(db_session, "capability-missing")


def test_playbook_service_raises_not_found_error(db_session):
    with pytest.raises(NotFoundError, match="Playbook not found"):
        get_playbook(db_session, "playbook-missing")

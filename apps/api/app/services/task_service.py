from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.auth import ensure_task_type_allowed
from app.config import Settings
from app.models.agent import AgentIdentity
from app.orm.approval_request import ApprovalRequestModel
from app.orm.task import TaskModel
from app.orm.run import RunModel
from app.repositories.playbook_repo import PlaybookRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.run_repo import RunRepository
from app.schemas.tasks import TaskCreate
from app.services.identifiers import new_resource_id
from app.services.redis_client import acquire_lock, release_lock


def create_task(session: Session, payload: TaskCreate) -> dict:
    _ensure_playbooks_exist(session, payload.playbook_ids)
    repo = TaskRepository(session)
    task_id = new_resource_id("task")
    model = TaskModel(
        id=task_id,
        title=payload.title,
        task_type=payload.task_type,
        input=payload.input,
        required_capability_ids=payload.required_capability_ids,
        playbook_ids=payload.playbook_ids,
        lease_allowed=payload.lease_allowed,
        approval_mode=payload.approval_mode,
        approval_rules=[rule.model_dump() for rule in payload.approval_rules],
        priority=payload.priority,
    )
    repo.create(model)
    return _task_to_dict(model)


def list_tasks(session: Session) -> list[dict]:
    return [_task_to_dict(m) for m in TaskRepository(session).list_all()]


def claim_task(
    session: Session,
    task_id: str,
    agent: AgentIdentity,
    settings: Settings | None = None,
) -> dict:
    lock_key = f"task:{task_id}:claim"
    if not acquire_lock(lock_key, ttl_seconds=10, settings=settings):
        raise ValueError("Task claim is being processed by another agent")
    try:
        repo = TaskRepository(session)
        task = repo.get(task_id)
        if task is None:
            raise KeyError("Task not found")
        if task.status != "pending":
            raise ValueError("Task is not claimable")
        ensure_task_type_allowed(agent, task.task_type)
        task.status = "claimed"
        task.claimed_by = agent.id
        repo.update(task)
        return _task_to_dict(task)
    finally:
        release_lock(lock_key, settings=settings)


def complete_task(
    session: Session,
    task_id: str,
    agent: AgentIdentity,
    result_summary: str,
    output_payload: dict,
) -> dict:
    task_repo = TaskRepository(session)
    run_repo = RunRepository(session)
    task = task_repo.get(task_id)
    if task is None:
        raise KeyError("Task not found")
    if task.claimed_by != agent.id:
        raise PermissionError("Task is not claimed by this agent")
    task.status = "completed"
    task_repo.update(task)
    _expire_task_approvals(session, task_id)
    run_id = new_resource_id("run")
    run = RunModel(
        id=run_id,
        task_id=task_id,
        agent_id=agent.id,
        status="completed",
        result_summary=result_summary,
        output_payload=output_payload,
    )
    run_repo.create(run)
    return _task_to_dict(task)


def _task_to_dict(model: TaskModel) -> dict:
    return {
        "id": model.id,
        "title": model.title,
        "task_type": model.task_type,
        "input": model.input,
        "required_capability_ids": model.required_capability_ids,
        "playbook_ids": model.playbook_ids,
        "lease_allowed": model.lease_allowed,
        "approval_mode": model.approval_mode,
        "approval_rules": model.approval_rules,
        "priority": model.priority,
        "status": model.status,
        "created_by": model.created_by,
        "claimed_by": model.claimed_by,
    }


def _ensure_playbooks_exist(session: Session, playbook_ids: list[str]) -> None:
    if not playbook_ids:
        return

    repo = PlaybookRepository(session)
    missing = [playbook_id for playbook_id in playbook_ids if repo.get(playbook_id) is None]
    if missing:
        joined = ", ".join(missing)
        raise KeyError(f"Unknown playbook reference: {joined}")


def _expire_task_approvals(session: Session, task_id: str) -> None:
    approvals = (
        session.query(ApprovalRequestModel)
        .filter(ApprovalRequestModel.task_id == task_id)
        .filter(ApprovalRequestModel.status.in_(["pending", "approved"]))
        .all()
    )
    if not approvals:
        return

    current_time = datetime.now(timezone.utc)
    for approval in approvals:
        approval.status = "expired"
        approval.expires_at = current_time
    session.flush()

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.task import TaskModel
from app.orm.run import RunModel
from app.repositories.task_repo import TaskRepository
from app.repositories.run_repo import RunRepository
from app.schemas.tasks import TaskCreate
from app.services.redis_client import acquire_lock, release_lock


def create_task(session: Session, payload: TaskCreate) -> dict:
    repo = TaskRepository(session)
    task_id = f"task-{len(repo.list_all()) + 1}"
    model = TaskModel(
        id=task_id,
        title=payload.title,
        task_type=payload.task_type,
        input=payload.input,
        required_capability_ids=payload.required_capability_ids,
        lease_allowed=payload.lease_allowed,
        approval_mode=payload.approval_mode,
        priority=payload.priority,
    )
    repo.create(model)
    return _task_to_dict(model)


def list_tasks(session: Session) -> list[dict]:
    return [_task_to_dict(m) for m in TaskRepository(session).list_all()]


def claim_task(session: Session, task_id: str, agent_id: str) -> dict:
    lock_key = f"task:{task_id}:claim"
    if not acquire_lock(lock_key, ttl_seconds=10):
        raise ValueError("Task claim is being processed by another agent")
    try:
        repo = TaskRepository(session)
        task = repo.get(task_id)
        if task is None:
            raise KeyError("Task not found")
        if task.status != "pending":
            raise ValueError("Task is not claimable")
        task.status = "claimed"
        task.claimed_by = agent_id
        repo.update(task)
        return _task_to_dict(task)
    finally:
        release_lock(lock_key)


def complete_task(session: Session, task_id: str, agent_id: str, result_summary: str, output_payload: dict) -> dict:
    task_repo = TaskRepository(session)
    run_repo = RunRepository(session)
    task = task_repo.get(task_id)
    if task is None:
        raise KeyError("Task not found")
    if task.claimed_by != agent_id:
        raise ValueError("Task is not claimed by this agent")
    task.status = "completed"
    task_repo.update(task)
    run_id = f"run-{len(run_repo.list_all()) + 1}"
    run = RunModel(
        id=run_id,
        task_id=task_id,
        agent_id=agent_id,
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
        "lease_allowed": model.lease_allowed,
        "approval_mode": model.approval_mode,
        "priority": model.priority,
        "status": model.status,
        "created_by": model.created_by,
        "claimed_by": model.claimed_by,
    }

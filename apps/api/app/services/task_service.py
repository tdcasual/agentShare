from __future__ import annotations

from app.models.run import RunRecord
from app.models.task import TaskRecord
from app.schemas.tasks import TaskCreate
from app.store import next_id, store


def create_task(payload: TaskCreate) -> dict:
    task = TaskRecord(
        id=next_id("task"),
        title=payload.title,
        task_type=payload.task_type,
        input=payload.input,
        required_capability_ids=payload.required_capability_ids,
        lease_allowed=payload.lease_allowed,
        approval_mode=payload.approval_mode,
        priority=payload.priority,
    )
    record = task.model_dump()
    store.tasks[task.id] = record
    return record


def list_tasks() -> list[dict]:
    return list(store.tasks.values())


def claim_task(task_id: str, agent_id: str) -> dict:
    task = store.tasks[task_id]
    if task["status"] != "pending":
        raise ValueError("Task is not claimable")
    task["status"] = "claimed"
    task["claimed_by"] = agent_id
    return task


def complete_task(
    task_id: str,
    agent_id: str,
    result_summary: str,
    output_payload: dict,
) -> dict:
    task = store.tasks[task_id]
    if task["claimed_by"] != agent_id:
        raise ValueError("Task is not claimed by this agent")
    task["status"] = "completed"
    run = RunRecord(
        id=next_id("run"),
        task_id=task_id,
        agent_id=agent_id,
        status="completed",
        result_summary=result_summary,
        output_payload=output_payload,
    )
    record = run.model_dump()
    store.runs.append(record)
    return task

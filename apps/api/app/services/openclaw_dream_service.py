from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import AuthorizationError, ConflictError, NotFoundError
from app.models.agent import AgentIdentity
from app.orm.openclaw_dream_run import OpenClawDreamRunModel
from app.orm.openclaw_dream_step import OpenClawDreamStepModel
from app.repositories.openclaw_dream_run_repo import OpenClawDreamRunRepository
from app.repositories.openclaw_dream_step_repo import OpenClawDreamStepRepository
from app.services.identifiers import new_resource_id
from app.services.event_service import record_event
from app.services.openclaw_dream_policy_service import (
    ensure_dream_mode_enabled,
    ensure_followup_budget_remaining,
    ensure_followup_tasks_allowed,
    ensure_step_budget_remaining,
)


def serialize_dream_run(model: OpenClawDreamRunModel) -> dict:
    return {
        "id": model.id,
        "agent_id": model.agent_id,
        "session_id": model.session_id,
        "task_id": model.task_id,
        "objective": model.objective,
        "status": model.status,
        "stop_reason": model.stop_reason,
        "step_budget": model.step_budget,
        "consumed_steps": model.consumed_steps,
        "created_followup_tasks": model.created_followup_tasks,
        "started_by_actor_type": model.started_by_actor_type,
        "started_by_actor_id": model.started_by_actor_id,
        "runtime_metadata": model.runtime_metadata or {},
        "updated_at": model.updated_at,
    }


def serialize_dream_step(model: OpenClawDreamStepModel) -> dict:
    return {
        "id": model.id,
        "run_id": model.run_id,
        "step_index": model.step_index,
        "step_type": model.step_type,
        "status": model.status,
        "input_payload": model.input_payload or {},
        "output_payload": model.output_payload or {},
        "token_usage": model.token_usage or {},
        "created_task_id": model.created_task_id,
        "updated_at": model.updated_at,
    }


def start_dream_run(
    session: Session,
    *,
    agent: AgentIdentity,
    objective: str,
    task_id: str | None = None,
    step_budget: int | None = None,
    started_by_actor_type: str = "agent",
    started_by_actor_id: str | None = None,
) -> dict:
    policy = ensure_dream_mode_enabled(agent)
    effective_budget = policy["max_steps_per_run"] if step_budget is None else min(
        max(step_budget, 1),
        policy["max_steps_per_run"],
    )
    model = OpenClawDreamRunModel(
        id=new_resource_id("dream-run"),
        agent_id=agent.id,
        session_id=agent.session_id or "",
        task_id=task_id,
        objective=objective,
        status="active",
        step_budget=effective_budget,
        consumed_steps=0,
        created_followup_tasks=0,
        started_by_actor_type=started_by_actor_type,
        started_by_actor_id=started_by_actor_id or agent.id,
        runtime_metadata={"channel": agent.labels.get("channel")} if agent.labels else {},
    )
    OpenClawDreamRunRepository(session).create(model)
    return serialize_dream_run(model)


def list_dream_runs(
    session: Session,
    *,
    agent: AgentIdentity | None = None,
    status: str | None = None,
) -> list[dict]:
    repo = OpenClawDreamRunRepository(session)
    items = repo.list_filtered(agent_id=agent.id if agent else None, status=status)
    return [serialize_dream_run(item) for item in items]


def get_dream_run_detail(
    session: Session,
    run_id: str,
    *,
    agent: AgentIdentity | None = None,
) -> dict:
    run = get_dream_run(session, run_id, agent=agent)
    steps = OpenClawDreamStepRepository(session).list_for_run(run.id)
    return {
        **serialize_dream_run(run),
        "steps": [serialize_dream_step(step) for step in steps],
    }


def get_dream_run(
    session: Session,
    run_id: str,
    *,
    agent: AgentIdentity | None = None,
) -> OpenClawDreamRunModel:
    model = OpenClawDreamRunRepository(session).get(run_id)
    if model is None:
        raise NotFoundError("Dream run not found")
    if agent is not None and model.agent_id != agent.id:
        raise AuthorizationError("Dream run does not belong to this agent")
    return model


def record_dream_step(
    session: Session,
    *,
    run_id: str,
    agent: AgentIdentity,
    step_type: str,
    status: str,
    input_payload: dict,
    output_payload: dict,
    token_usage: dict,
    created_task_id: str | None = None,
) -> dict:
    run_repo = OpenClawDreamRunRepository(session)
    step_repo = OpenClawDreamStepRepository(session)
    run = get_dream_run(session, run_id, agent=agent)
    if run.status != "active":
        raise ConflictError("Dream run is not active")
    ensure_step_budget_remaining(consumed_steps=run.consumed_steps, step_budget=run.step_budget)
    next_index = run.consumed_steps + 1
    step = OpenClawDreamStepModel(
        id=new_resource_id("dream-step"),
        run_id=run.id,
        step_index=next_index,
        step_type=step_type,
        status=status,
        input_payload=input_payload,
        output_payload=output_payload,
        token_usage=token_usage,
        created_task_id=created_task_id,
    )
    step_repo.create(step)
    run.consumed_steps = next_index
    if next_index >= run.step_budget:
        run.status = "stopped"
        run.stop_reason = "budget_exhausted"
    run_repo.update(run)
    return {
        "step": serialize_dream_step(step),
        "run": serialize_dream_run(run),
    }


def stop_dream_run(
    session: Session,
    *,
    run_id: str,
    agent: AgentIdentity,
    stop_reason: str,
) -> dict:
    repo = OpenClawDreamRunRepository(session)
    run = get_dream_run(session, run_id, agent=agent)
    run.status = "stopped"
    run.stop_reason = stop_reason
    repo.update(run)
    return serialize_dream_run(run)


def stop_dream_run_with_event(
    session: Session,
    *,
    run_id: str,
    agent: AgentIdentity,
    stop_reason: str,
    detail: str,
) -> dict:
    repo = OpenClawDreamRunRepository(session)
    run = get_dream_run(session, run_id, agent=agent)
    if run.status == "active":
        run.status = "stopped"
        run.stop_reason = stop_reason
        repo.update(run)

    record_event(
        session,
        event_type="dream_run_stopped",
        actor_type="agent",
        actor_id=agent.id,
        subject_type="dream_run",
        subject_id=run.id,
        summary=f"{agent.name} stopped dream run {run.id}",
        details=detail,
        severity="warning",
        action_url=f"/identities?agentId={agent.id}&dreamRunId={run.id}",
        metadata={
            "agent_id": agent.id,
            "run_id": run.id,
            "objective": run.objective,
            "stop_reason": run.stop_reason,
        },
    )
    return serialize_dream_run(run)


def pause_dream_run(
    session: Session,
    *,
    run_id: str,
    reason: str,
) -> dict:
    repo = OpenClawDreamRunRepository(session)
    run = get_dream_run(session, run_id)
    if run.status != "active":
        raise ConflictError("Dream run is not active")
    run.status = "paused"
    run.stop_reason = reason
    repo.update(run)
    return serialize_dream_run(run)


def resume_dream_run(
    session: Session,
    *,
    run_id: str,
) -> dict:
    repo = OpenClawDreamRunRepository(session)
    run = get_dream_run(session, run_id)
    if run.status != "paused":
        raise ConflictError("Dream run is not paused")
    if run.consumed_steps >= run.step_budget:
        raise ConflictError("Dream run step budget exhausted")
    run.status = "active"
    run.stop_reason = None
    repo.update(run)
    return serialize_dream_run(run)


def register_followup_task(
    session: Session,
    *,
    run_id: str,
    agent: AgentIdentity,
    created_task_id: str,
) -> dict:
    run_repo = OpenClawDreamRunRepository(session)
    step_repo = OpenClawDreamStepRepository(session)
    run = ensure_followup_task_allowed(session, run_id=run_id, agent=agent)
    run.created_followup_tasks += 1
    step = OpenClawDreamStepModel(
        id=new_resource_id("dream-step"),
        run_id=run.id,
        step_index=run.consumed_steps + 1,
        step_type="propose_task",
        status="completed",
        input_payload={},
        output_payload={"created_task_id": created_task_id},
        token_usage={},
        created_task_id=created_task_id,
    )
    step_repo.create(step)
    run.consumed_steps += 1
    if run.consumed_steps >= run.step_budget:
        run.status = "stopped"
        run.stop_reason = "budget_exhausted"
    run_repo.update(run)
    return {
        "step": serialize_dream_step(step),
        "run": serialize_dream_run(run),
    }


def ensure_followup_task_allowed(
    session: Session,
    *,
    run_id: str,
    agent: AgentIdentity,
) -> OpenClawDreamRunModel:
    run = get_dream_run(session, run_id, agent=agent)
    if run.status != "active":
        raise ConflictError("Dream run is not active")
    policy = ensure_followup_tasks_allowed(agent)
    ensure_followup_budget_remaining(
        created_followup_tasks=run.created_followup_tasks,
        max_followup_tasks=policy["max_followup_tasks"],
    )
    ensure_step_budget_remaining(consumed_steps=run.consumed_steps, step_budget=run.step_budget)
    return run

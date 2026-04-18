from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthenticatedActor,
    require_agent,
    require_management_or_agent,
    require_management_or_agent_action,
)
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.schemas.task_targets import TaskTargetListResponse, TaskTargetResponse
from app.schemas.tasks import TaskComplete, TaskCreate
from app.services.audit_service import actor_payload, write_audit_event
from app.services.event_service import record_event
from app.services.review_service import publication_status_for_actor
from app.services.task_service import (
    claim_task,
    claim_task_target,
    complete_task,
    complete_task_target,
    create_task,
    list_assigned_task_targets,
    list_tasks,
)

router = APIRouter(prefix="/api/tasks")
task_targets_router = APIRouter(prefix="/api/task-targets")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    tags=["Management", "Agent Runtime"],
    summary="Publish or submit a task",
    description=(
        "Management sessions may publish an active task immediately. "
        "Authenticated runtime agents may submit a pending-review task proposal for human approval."
    ),
)
def create_task_route(
    payload: TaskCreate,
    response: Response,
    actor: AuthenticatedActor = Depends(require_management_or_agent_action("tasks:create")),
    session: Session = Depends(get_db),
) -> dict:
    task = create_task(session, payload, actor=actor)
    if publication_status_for_actor(actor.actor_type) == "pending_review":
        response.status_code = status.HTTP_202_ACCEPTED
    write_audit_event(session, "task_created", {
        "task_id": task["id"],
        "task_type": task["task_type"],
        **actor_payload(actor),
    })
    return task


@router.get(
    "",
    tags=["Knowledge"],
    summary="List available tasks",
    description="Authenticated task queue listing for runtime agents and management sessions.",
)
def list_tasks_route(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    actor: AuthenticatedActor = Depends(require_management_or_agent),
    session: Session = Depends(get_db),
) -> dict:
    return {"items": list_tasks(session, actor=actor, limit=limit, offset=offset)}


@router.get(
    "/assigned",
    response_model=TaskTargetListResponse,
    tags=["Agent Runtime"],
    summary="List tasks assigned to the current remote-access token",
    description="Return only task targets addressed to the authenticated remote-access token. OpenClaw session-backed runtimes without a token binding will not receive explicit-token assignments here.",
)
def list_assigned_tasks_route(
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    return {"items": list_assigned_task_targets(session, agent)}


@task_targets_router.post(
    "/{target_id}/claim",
    response_model=TaskTargetResponse,
    tags=["Agent Runtime"],
    summary="Claim a remote-token-targeted task",
    description="Authenticate as a remote-access token and atomically claim the addressed task target.",
)
def claim_task_target_route(
    target_id: str,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    target = claim_task_target(session, target_id, agent, settings=settings)
    write_audit_event(session, "task_target_claimed", {
        "task_target_id": target_id,
        "task_id": target["task_id"],
        "agent_id": agent.id,
        "token_id": agent.token_id,
    })
    return target


@task_targets_router.post(
    "/{target_id}/complete",
    response_model=TaskTargetResponse,
    tags=["Agent Runtime"],
    summary="Complete a remote-token-targeted task",
    description="Mark a claimed remote-token task target complete and persist the resulting token-linked run record.",
)
def complete_task_target_route(
    target_id: str,
    payload: TaskComplete,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    target = complete_task_target(
        session,
        target_id,
        agent,
        payload.result_summary,
        payload.output_payload,
        settings=settings,
    )
    record_event(
        session,
        event_type="task_completed",
        actor_type="agent",
        actor_id=agent.id,
        subject_type="task_target",
        subject_id=target_id,
        summary=f"{agent.name} completed task target {target_id}",
        details=payload.result_summary or "",
        action_url="/tasks",
        metadata={
            "task_id": target["task_id"],
            "token_id": agent.token_id,
            "result_summary": payload.result_summary,
        },
    )
    write_audit_event(session, "task_target_completed", {
        "task_target_id": target_id,
        "task_id": target["task_id"],
        "agent_id": agent.id,
        "token_id": agent.token_id,
    })
    return target


@router.post(
    "/{task_id}/claim",
    tags=["Agent Runtime"],
    summary="Claim a task",
    description="Authenticate as an agent, verify the task type is allowed, and atomically claim the task.",
)
def claim_task_route(
    task_id: str,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    task = claim_task(session, task_id, agent, settings=settings)
    write_audit_event(session, "task_claimed", {"task_id": task_id, "agent_id": agent.id})
    return task


@router.post(
    "/{task_id}/complete",
    tags=["Agent Runtime"],
    summary="Complete a task",
    description="Mark a claimed task complete and persist the resulting run record.",
)
def complete_task_route(
    task_id: str,
    payload: TaskComplete,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    task = complete_task(
        session,
        task_id,
        agent,
        payload.result_summary,
        payload.output_payload,
        settings=settings,
    )
    record_event(
        session,
        event_type="task_completed",
        actor_type="agent",
        actor_id=agent.id,
        subject_type="task",
        subject_id=task_id,
        summary=f"{agent.name} completed task {task_id}",
        details=payload.result_summary or "",
        action_url="/tasks",
        metadata={
            "task_id": task_id,
            "token_id": agent.token_id,
            "result_summary": payload.result_summary,
        },
    )
    write_audit_event(session, "task_completed", {"task_id": task_id, "agent_id": agent.id})
    return task

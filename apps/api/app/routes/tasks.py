from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedActor, ManagementIdentity, require_agent, require_management_or_agent, require_management_session
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.schemas.task_targets import TaskTargetListResponse, TaskTargetResponse
from app.schemas.tasks import TaskComplete, TaskCreate
from app.services.audit_service import actor_payload, write_audit_event
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
    tags=["Management"],
    summary="Publish a task",
    description="Create a new task that agents may later list, claim, invoke capabilities for, and complete.",
)
def create_task_route(
    payload: TaskCreate,
    response: Response,
    actor: AuthenticatedActor = Depends(require_management_or_agent),
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
    description="Public task queue listing so agents can discover work before authenticating to claim it.",
)
def list_tasks_route(session: Session = Depends(get_db)) -> dict:
    return {"items": list_tasks(session)}


@router.get(
    "/assigned",
    response_model=TaskTargetListResponse,
    tags=["Agent Runtime"],
    summary="List tasks assigned to the current token",
    description="Return only task targets addressed to the authenticated runtime token.",
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
    summary="Claim a token-targeted task",
    description="Authenticate as an agent token and atomically claim the addressed task target.",
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
    summary="Complete a token-targeted task",
    description="Mark a claimed task target complete and persist the resulting token-linked run record.",
)
def complete_task_target_route(
    target_id: str,
    payload: TaskComplete,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    target = complete_task_target(session, target_id, agent, payload.result_summary, payload.output_payload)
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
) -> dict:
    task = complete_task(session, task_id, agent, payload.result_summary, payload.output_payload)
    write_audit_event(session, "task_completed", {"task_id": task_id, "agent_id": agent.id})
    return task

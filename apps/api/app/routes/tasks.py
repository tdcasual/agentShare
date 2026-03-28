from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_agent, require_management_session
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.schemas.tasks import TaskComplete, TaskCreate
from app.services.audit_service import write_audit_event
from app.services.task_service import claim_task, complete_task, create_task, list_tasks

router = APIRouter(prefix="/api/tasks")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Publish a task",
    description="Create a new task that agents may later list, claim, invoke capabilities for, and complete.",
)
def create_task_route(
    payload: TaskCreate,
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    try:
        task = create_task(session, payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    write_audit_event(session, "task_created", {
        "task_id": task["id"],
        "task_type": task["task_type"],
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
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
    try:
        task = claim_task(session, task_id, agent, settings=settings)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found") from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
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
    try:
        task = complete_task(session, task_id, agent, payload.result_summary, payload.output_payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found") from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    write_audit_event(session, "task_completed", {"task_id": task_id, "agent_id": agent.id})
    return task

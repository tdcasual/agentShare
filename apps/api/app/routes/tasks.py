from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.db import get_db
from app.models.agent import AgentIdentity
from app.schemas.tasks import TaskComplete, TaskCreate
from app.services.audit_service import write_audit_event
from app.services.task_service import claim_task, complete_task, create_task, list_tasks

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_task_route(payload: TaskCreate, session: Session = Depends(get_db)) -> dict:
    task = create_task(session, payload)
    write_audit_event(session, "task_created", {"task_id": task["id"], "task_type": task["task_type"]})
    return task


@router.get("")
def list_tasks_route(session: Session = Depends(get_db)) -> dict:
    return {"items": list_tasks(session)}


@router.post("/{task_id}/claim")
def claim_task_route(task_id: str, agent: AgentIdentity = Depends(require_agent), session: Session = Depends(get_db)) -> dict:
    try:
        task = claim_task(session, task_id, agent.id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    write_audit_event(session, "task_claimed", {"task_id": task_id, "agent_id": agent.id})
    return task


@router.post("/{task_id}/complete")
def complete_task_route(
    task_id: str,
    payload: TaskComplete,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    try:
        task = complete_task(session, task_id, agent.id, payload.result_summary, payload.output_payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    write_audit_event(session, "task_completed", {"task_id": task_id, "agent_id": agent.id})
    return task

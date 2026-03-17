from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.playbooks import PlaybookCreate
from app.services.audit_service import write_audit_event
from app.services.playbook_service import create_playbook, search_playbooks

router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_playbook_route(payload: PlaybookCreate, session: Session = Depends(get_db)) -> dict:
    record = create_playbook(session, payload)
    write_audit_event(session, "playbook_created", {"playbook_id": record["id"], "task_type": record["task_type"]})
    return record


@router.get("/search")
def search_playbooks_route(task_type: str | None = Query(default=None), session: Session = Depends(get_db)) -> dict:
    return {"items": search_playbooks(session, task_type)}

from fastapi import APIRouter, Query, status

from app.schemas.playbooks import PlaybookCreate
from app.services.audit_service import write_audit_event
from app.services.playbook_service import create_playbook, search_playbooks


router = APIRouter(prefix="/api/playbooks", tags=["playbooks"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_playbook_route(payload: PlaybookCreate) -> dict:
    record = create_playbook(payload)
    write_audit_event("playbook_created", {"playbook_id": record["id"], "task_type": record["task_type"]})
    return record


@router.get("/search")
def search_playbooks_route(task_type: str | None = Query(default=None)) -> dict:
    return {"items": search_playbooks(task_type)}

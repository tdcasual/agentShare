from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.run_repo import RunRepository

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.get("")
def list_runs(session: Session = Depends(get_db)) -> dict:
    repo = RunRepository(session)
    items = [
        {
            "id": m.id,
            "task_id": m.task_id,
            "agent_id": m.agent_id,
            "status": m.status,
            "result_summary": m.result_summary,
            "output_payload": m.output_payload,
            "error_summary": m.error_summary,
            "capability_invocations": m.capability_invocations,
            "lease_events": m.lease_events,
        }
        for m in repo.list_all()
    ]
    return {"items": items}

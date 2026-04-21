from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import require_management_session
from app.db import get_db
from app.repositories.run_repo import RunRepository

router = APIRouter(prefix="/api/runs")


@router.get(
    "",
    tags=["Observability"],
    summary="List recorded runs",
    description="Return persisted task run history for the management console.",
)
def list_runs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    manager=Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    repo = RunRepository(session)
    items = [
        {
            "id": model.id,
            "task_id": model.task_id,
            "agent_id": model.agent_id,
            "access_token_id": model.access_token_id,
            "task_target_id": model.task_target_id,
            "status": model.status,
            "result_summary": model.result_summary,
            "output_payload": model.output_payload,
            "error_summary": model.error_summary,
            "capability_invocations": model.capability_invocations,
            "lease_events": model.lease_events,
        }
        for model in repo.list_all(limit=limit, offset=offset)
    ]
    return {"items": items}

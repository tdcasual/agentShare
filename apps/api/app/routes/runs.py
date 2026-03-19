from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_bootstrap_agent
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
    agent=Depends(require_bootstrap_agent),
    session: Session = Depends(get_db),
) -> dict:
    repo = RunRepository(session)
    items = [
        {
            "id": model.id,
            "task_id": model.task_id,
            "agent_id": model.agent_id,
            "status": model.status,
            "result_summary": model.result_summary,
            "output_payload": model.output_payload,
            "error_summary": model.error_summary,
            "capability_invocations": model.capability_invocations,
            "lease_events": model.lease_events,
        }
        for model in repo.list_all()
    ]
    return {"items": items}

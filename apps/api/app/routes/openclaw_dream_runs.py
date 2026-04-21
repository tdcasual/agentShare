from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import (
    ManagementIdentity,
    require_agent,
    require_management_action,
)
from app.db import get_db
from app.models.runtime_principal import RuntimePrincipal
from app.schemas.openclaw_dream_runs import (
    OpenClawDreamRunCreate,
    OpenClawDreamRunDetail,
    OpenClawDreamRunListResponse,
    OpenClawDreamRunPause,
    OpenClawDreamRunStop,
    OpenClawDreamRunSummary,
    OpenClawDreamStepCreate,
    OpenClawDreamStepCreateResponse,
)
from app.services.audit_service import write_audit_event
from app.services.openclaw_dream_service import (
    get_dream_run_detail,
    list_dream_runs,
    pause_dream_run,
    record_dream_step,
    resume_dream_run,
    start_dream_run,
    stop_dream_run,
)

router = APIRouter(prefix="/api/openclaw/dream-runs")


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=OpenClawDreamRunSummary,
    tags=["Agent Runtime"],
    summary="Start a bounded dream run",
    description="Authenticate as an OpenClaw runtime agent and start one explicit bounded dream run.",
)
def create_openclaw_dream_run(
    payload: OpenClawDreamRunCreate,
    agent: RuntimePrincipal = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    run = start_dream_run(
        session,
        agent=agent,
        objective=payload.objective,
        task_id=payload.task_id,
        step_budget=payload.step_budget,
    )
    write_audit_event(session, "openclaw_dream_run_created", {"agent_id": agent.id, "run_id": run["id"]})
    return run


@router.get(
    "",
    response_model=OpenClawDreamRunListResponse,
    tags=["Management"],
    summary="List dream runs",
    description="Management may inspect all dream runs across OpenClaw agents.",
)
def list_openclaw_dream_runs(
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
    status_filter: str | None = Query(default=None, alias="status"),
) -> dict:
    del manager
    return {"items": list_dream_runs(session, agent=None, status=status_filter)}


@router.get(
    "/{run_id}",
    response_model=OpenClawDreamRunDetail,
    tags=["Management"],
    summary="Get one dream run",
    description="Read one dream run by id.",
)
def get_openclaw_dream_run(
    run_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:list")),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return get_dream_run_detail(session, run_id)


@router.post(
    "/{run_id}/steps",
    status_code=status.HTTP_201_CREATED,
    response_model=OpenClawDreamStepCreateResponse,
    tags=["Agent Runtime"],
    summary="Record one dream step",
    description="Append one explicit plan/reflect/propose-task step to a bounded dream run.",
)
def create_openclaw_dream_step(
    run_id: str,
    payload: OpenClawDreamStepCreate,
    agent: RuntimePrincipal = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    response = record_dream_step(
        session,
        run_id=run_id,
        agent=agent,
        step_type=payload.step_type,
        status=payload.status,
        input_payload=payload.input_payload,
        output_payload=payload.output_payload,
        token_usage=payload.token_usage,
        created_task_id=payload.created_task_id,
    )
    write_audit_event(session, "openclaw_dream_step_recorded", {"agent_id": agent.id, "run_id": run_id})
    return response


@router.post(
    "/{run_id}/stop",
    response_model=OpenClawDreamRunSummary,
    tags=["Agent Runtime"],
    summary="Stop a dream run",
    description="Stop one active dream run with an explicit stop reason.",
)
def stop_openclaw_dream_run(
    run_id: str,
    payload: OpenClawDreamRunStop,
    agent: RuntimePrincipal = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    response = stop_dream_run(session, run_id=run_id, agent=agent, stop_reason=payload.stop_reason)
    write_audit_event(session, "openclaw_dream_run_stopped", {"agent_id": agent.id, "run_id": run_id})
    return response


@router.post(
    "/{run_id}/pause",
    response_model=OpenClawDreamRunSummary,
    tags=["Management"],
    summary="Pause a dream run",
    description="Pause one active dream run through the management control plane.",
)
def pause_openclaw_dream_run(
    run_id: str,
    payload: OpenClawDreamRunPause,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    response = pause_dream_run(session, run_id=run_id, reason=payload.reason)
    write_audit_event(session, "openclaw_dream_run_paused", {"run_id": run_id, "reason": payload.reason})
    return response


@router.post(
    "/{run_id}/resume",
    response_model=OpenClawDreamRunSummary,
    tags=["Management"],
    summary="Resume a paused dream run",
    description="Resume one paused dream run through the management control plane.",
)
def resume_openclaw_dream_run(
    run_id: str,
    manager: ManagementIdentity = Depends(require_management_action("agents:create")),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    response = resume_dream_run(session, run_id=run_id)
    write_audit_event(session, "openclaw_dream_run_resumed", {"run_id": run_id})
    return response

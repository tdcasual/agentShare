from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.runtime_principal import RuntimePrincipal
from app.schemas.invoke import LeaseRequest
from app.services.approval_service import ApprovalRequiredError, PolicyDeniedError
from app.services.gateway import issue_lease

router = APIRouter(prefix="/api/capabilities")


@router.post(
    "/{capability_id}/lease",
    status_code=status.HTTP_201_CREATED,
    tags=["Agent Runtime"],
    summary="Request a capability lease",
    description="Authenticate as the claiming agent and request a short-lived lease when both the task and capability permit it.",
)
def issue_lease_route(
    capability_id: str,
    payload: LeaseRequest,
    agent: RuntimePrincipal = Depends(require_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    try:
        return issue_lease(
            session,
            capability_id,
            payload.task_id,
            payload.purpose,
            agent,
            settings=settings,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PolicyDeniedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.detail) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ApprovalRequiredError as exc:
        session.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc

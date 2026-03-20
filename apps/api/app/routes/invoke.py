from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.db import get_db
from app.models.agent import AgentIdentity
from app.schemas.invoke import InvokeRequest
from app.services.approval_service import ApprovalRequiredError
from app.services.gateway import GatewayConfigurationError, GatewayExecutionError, proxy_invoke

router = APIRouter(prefix="/api/capabilities")


@router.post(
    "/{capability_id}/invoke",
    tags=["Agent Runtime"],
    summary="Invoke a capability through proxy mode",
    description="Authenticate as the claiming agent, verify the task and capability contract, then proxy the request without exposing the raw secret.",
)
def invoke_capability_route(
    capability_id: str,
    payload: InvokeRequest,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
) -> dict:
    try:
        return proxy_invoke(session, capability_id, payload.task_id, payload.parameters, agent)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ApprovalRequiredError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc
    except GatewayExecutionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    except GatewayConfigurationError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)) from exc

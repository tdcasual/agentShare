from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.db import get_db
from app.schemas.approvals import (
    ApprovalDecisionRequest,
    ApprovalRejectionRequest,
    ApprovalResponse,
)
from app.services.approval_service import (
    approve_request,
    approval_to_dict,
    list_approval_requests,
    reject_request,
)

router = APIRouter(prefix="/api/approvals")


@router.get(
    "",
    tags=["Management"],
    summary="List approval requests",
    description="Return approval requests for management review, optionally filtered by status.",
)
def list_approvals_route(
    status_filter: str | None = Query(default=None, alias="status"),
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager  # managed by dependency; kept to enforce session auth
    try:
        approvals = list_approval_requests(session=session, status=status_filter)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"items": [approval_to_dict(model) for model in approvals]}


@router.post(
    "/{approval_id}/approve",
    response_model=ApprovalResponse,
    tags=["Management"],
    summary="Approve a pending request",
    description="Mark a pending approval request as approved and set its decision expiry.",
)
def approve_request_route(
    approval_id: str,
    payload: ApprovalDecisionRequest,
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    try:
        updated = approve_request(
            session=session,
            approval_id=approval_id,
            decided_by=manager.id,
            reason=payload.reason,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return approval_to_dict(updated)


@router.post(
    "/{approval_id}/reject",
    response_model=ApprovalResponse,
    tags=["Management"],
    summary="Reject a pending request",
    description="Mark a pending approval request as rejected with an operator-provided reason.",
)
def reject_request_route(
    approval_id: str,
    payload: ApprovalRejectionRequest,
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    try:
        updated = reject_request(
            session=session,
            approval_id=approval_id,
            decided_by=manager.id,
            reason=payload.reason,
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return approval_to_dict(updated)

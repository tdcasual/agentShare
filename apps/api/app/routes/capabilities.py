from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.db import get_db
from app.repositories.secret_repo import SecretRepository
from app.schemas.capabilities import CapabilityCreate, CapabilityResponse
from app.services.audit_service import write_audit_event
from app.services.capability_service import create_capability, list_capabilities

router = APIRouter(prefix="/api/capabilities")


@router.post(
    "",
    response_model=CapabilityResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create a capability binding",
    description="Bind a stored secret into a capability contract and verify the secret scope satisfies the capability requirements.",
)
def create_capability_route(
    payload: CapabilityCreate,
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    secret_repo = SecretRepository(session)
    secret = secret_repo.get(payload.secret_id)
    if secret is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")

    try:
        record = create_capability(session, payload, secret)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    write_audit_event(session, "capability_created", {
        "capability_id": record["id"],
        "secret_id": payload.secret_id,
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
    })
    return record


@router.get(
    "",
    tags=["Management"],
    summary="List capability bindings",
    description="Return the management view of capabilities and their normalized secret-scope contracts.",
)
def list_capabilities_route(
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    items = list_capabilities(session)
    write_audit_event(session, "capabilities_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
    })
    return {"items": items}

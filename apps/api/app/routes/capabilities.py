from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth import (
    AuthenticatedActor,
    ManagementIdentity,
    require_admin_management_or_agent,
    require_management_session,
)
from app.db import get_db
from app.errors import NotFoundError
from app.repositories.secret_repo import SecretRepository
from app.schemas.capabilities import CapabilityCreate, CapabilityResponse
from app.services.audit_service import actor_payload, write_audit_event
from app.services.capability_service import create_capability, list_capabilities
from app.services.review_service import publication_status_for_actor

router = APIRouter(prefix="/api/capabilities")


@router.post(
    "",
    response_model=CapabilityResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management", "Agent Runtime"],
    summary="Create or submit a capability binding",
    description=(
        "Admin management sessions may publish an active capability binding immediately. "
        "Authenticated runtime agents may submit a pending-review capability proposal that references an existing secret."
    ),
)
def create_capability_route(
    payload: CapabilityCreate,
    response: Response,
    actor: AuthenticatedActor = Depends(require_admin_management_or_agent),
    session: Session = Depends(get_db),
) -> dict:
    secret_repo = SecretRepository(session)
    secret = secret_repo.get(payload.secret_id)
    if secret is None:
        raise NotFoundError("Secret not found")

    record = create_capability(session, payload, secret, actor=actor)
    if publication_status_for_actor(actor.actor_type) == "pending_review":
        response.status_code = status.HTTP_202_ACCEPTED

    write_audit_event(session, "capability_created", {
        "capability_id": record["id"],
        "secret_id": payload.secret_id,
        **actor_payload(actor),
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

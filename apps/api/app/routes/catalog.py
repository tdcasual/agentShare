from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.db import get_db
from app.schemas.catalog import CatalogResponse
from app.services.audit_service import write_audit_event
from app.services.catalog_service import list_catalog_items

router = APIRouter(prefix="/api/catalog")


@router.get(
    "",
    response_model=CatalogResponse,
    tags=["Management"],
    summary="List the approved agent catalog",
    description="Return the operator-facing catalog of agent-published assets and skills that have passed human review.",
)
def list_catalog_route(
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    items = list_catalog_items(session)
    write_audit_event(session, "catalog_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
    })
    return {"items": items}

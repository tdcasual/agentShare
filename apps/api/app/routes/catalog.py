from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.db import get_db
from app.schemas.catalog import CatalogReleaseHistoryResponse, CatalogResponse
from app.services.audit_service import write_audit_event
from app.services.catalog_service import get_catalog_release_history, list_catalog_items

router = APIRouter(prefix="/api/catalog")


@router.get(
    "",
    response_model=CatalogResponse,
    tags=["Management"],
    summary="List the approved agent catalog",
    description="Return the operator-facing catalog of agent-published assets and skills that have passed human review.",
)
def list_catalog_route(
    resource_kind: str | None = Query(default=None),
    release_status: str | None = Query(default=None),
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    items = list_catalog_items(session, resource_kind=resource_kind, release_status=release_status)
    write_audit_event(session, "catalog_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
        "resource_kind": resource_kind,
        "release_status": release_status,
    })
    return {"items": items}


@router.get(
    "/{resource_kind}/{resource_id}",
    response_model=CatalogReleaseHistoryResponse,
    tags=["Management"],
    summary="Get one resource catalog release history",
    description="Return the current catalog release together with prior releases for one operator-facing resource.",
)
def get_catalog_release_history_route(
    resource_kind: str,
    resource_id: str,
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    payload = get_catalog_release_history(session, resource_kind=resource_kind, resource_id=resource_id)
    write_audit_event(session, "catalog_release_history_viewed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "resource_kind": resource_kind,
        "resource_id": resource_id,
        "current_release_id": payload["current_release"]["release_id"],
    })
    return payload

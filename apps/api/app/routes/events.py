from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_admin_management_session
from app.db import get_db
from app.schemas.events import EventListResponse, EventResponse
from app.services.event_service import list_events, mark_event_read

router = APIRouter(prefix="/api/events")


@router.get(
    "",
    response_model=EventListResponse,
    tags=["Management"],
    summary="List control-plane inbox events",
    description="Return recent structured events for the operator inbox.",
)
def list_events_route(
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return {"items": list_events(session)}


@router.post(
    "/{event_id}/read",
    response_model=EventResponse,
    tags=["Management"],
    summary="Mark an inbox event as read",
    description="Mark a structured control-plane event as read for the current management view.",
)
def mark_event_read_route(
    event_id: str,
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return mark_event_read(session, event_id)

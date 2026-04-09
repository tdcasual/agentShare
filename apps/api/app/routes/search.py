from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import ManagementIdentity, require_management_session
from app.db import get_db
from app.schemas.search import SearchResponse
from app.services.search_service import search_control_plane

router = APIRouter(prefix="/api/search")


@router.get(
    "",
    response_model=SearchResponse,
    tags=["Management"],
    summary="Search across control-plane entities",
    description="Return grouped management search results for identities, tasks, assets, skills, and events.",
)
def search_route(
    q: str = Query(default="", min_length=0),
    limit_per_group: int = Query(default=5, ge=1, le=20),
    manager: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    del manager
    return search_control_plane(session, q, limit_per_group=limit_per_group)

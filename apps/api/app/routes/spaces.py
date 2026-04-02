from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth import (
    ManagementIdentity,
    require_management_session,
    require_operator_management_session,
)
from app.db import get_db
from app.errors import NotFoundError
from app.orm.space import SpaceModel
from app.orm.space_member import SpaceMemberModel
from app.repositories.space_repo import SpaceRepository
from app.schemas.spaces import (
    SpaceCreateRequest,
    SpaceListResponse,
    SpaceMemberCreateRequest,
    SpaceMemberResponse,
    SpaceResponse,
)
from app.services.identifiers import new_resource_id

router = APIRouter(prefix="/api/spaces")


@router.get(
    "",
    response_model=SpaceListResponse,
    tags=["Management"],
    summary="List operational spaces",
    description="Return persisted spaces, optionally filtered by focused agent context.",
)
def list_spaces_route(
    agent_id: str | None = Query(default=None),
    _: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    repo = SpaceRepository(session)
    spaces = repo.list_spaces_for_agent(agent_id) if agent_id else repo.list_spaces()
    return {"items": [_serialize_space(repo, model) for model in spaces]}


@router.post(
    "",
    response_model=SpaceResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create an operational space",
    description="Create a lightweight persisted workspace for operational coordination.",
)
def create_space_route(
    payload: SpaceCreateRequest,
    manager: ManagementIdentity = Depends(require_operator_management_session),
    session: Session = Depends(get_db),
) -> dict:
    repo = SpaceRepository(session)
    model = repo.create_space(
        SpaceModel(
            id=new_resource_id("space"),
            name=payload.name,
            summary=payload.summary,
            status="active",
            created_by_actor_id=manager.id,
        )
    )
    return _serialize_space(repo, model)


@router.get(
    "/{space_id}",
    response_model=SpaceResponse,
    tags=["Management"],
    summary="Get a space",
    description="Return one persisted space with its member and timeline context.",
)
def get_space_route(
    space_id: str,
    _: ManagementIdentity = Depends(require_management_session),
    session: Session = Depends(get_db),
) -> dict:
    repo = SpaceRepository(session)
    model = repo.get_space(space_id)
    if model is None:
        raise NotFoundError("Space not found")
    return _serialize_space(repo, model)


@router.post(
    "/{space_id}/members",
    response_model=SpaceMemberResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Attach a member to a space",
    description="Attach an agent or human context to an existing space.",
)
def create_space_member_route(
    space_id: str,
    payload: SpaceMemberCreateRequest,
    _: ManagementIdentity = Depends(require_operator_management_session),
    session: Session = Depends(get_db),
) -> dict:
    repo = SpaceRepository(session)
    if repo.get_space(space_id) is None:
        raise NotFoundError("Space not found")
    member = repo.create_member(
        SpaceMemberModel(
            id=new_resource_id("space-member"),
            space_id=space_id,
            member_type=payload.member_type,
            member_id=payload.member_id,
            role=payload.role,
        )
    )
    return _serialize_member(member)


def _serialize_space(repo: SpaceRepository, model: SpaceModel) -> dict:
    return {
        "id": model.id,
        "name": model.name,
        "summary": model.summary,
        "status": model.status,
        "created_by_actor_id": model.created_by_actor_id,
        "created_at": model.created_at,
        "updated_at": model.updated_at,
        "members": [_serialize_member(member) for member in repo.list_members(model.id)],
        "timeline": [_serialize_timeline_entry(entry) for entry in repo.list_timeline(model.id)],
    }


def _serialize_member(model: SpaceMemberModel) -> dict:
    return {
        "id": model.id,
        "member_type": model.member_type,
        "member_id": model.member_id,
        "role": model.role,
        "created_at": model.created_at,
    }


def _serialize_timeline_entry(model) -> dict:
    return {
        "id": model.id,
        "entry_type": model.entry_type,
        "subject_type": model.subject_type,
        "subject_id": model.subject_id,
        "summary": model.summary,
        "created_at": model.created_at,
    }

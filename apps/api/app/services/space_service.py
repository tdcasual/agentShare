from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.space_timeline_entry import SpaceTimelineEntryModel
from app.repositories.space_repo import SpaceRepository
from app.services.identifiers import new_resource_id


def project_actor_activity_to_spaces(
    session: Session,
    *,
    actor_type: str,
    actor_id: str,
    entry_type: str,
    subject_type: str,
    subject_id: str,
    summary: str,
) -> None:
    if actor_type != "agent":
        return

    repo = SpaceRepository(session)
    for space in repo.list_spaces_for_agent(actor_id):
        _append_timeline_entry(
            repo,
            space_id=space.id,
            entry_type=entry_type,
            subject_type=subject_type,
            subject_id=subject_id,
            summary=summary,
        )


def project_review_decision_to_spaces(
    session: Session,
    *,
    created_by_actor_type: str | None,
    created_by_actor_id: str | None,
    entry_type: str,
    subject_type: str,
    subject_id: str,
    summary: str,
) -> None:
    if created_by_actor_type != "agent" or not created_by_actor_id:
        return

    project_actor_activity_to_spaces(
        session,
        actor_type=created_by_actor_type,
        actor_id=created_by_actor_id,
        entry_type=entry_type,
        subject_type=subject_type,
        subject_id=subject_id,
        summary=summary,
    )


def _append_timeline_entry(
    repo: SpaceRepository,
    *,
    space_id: str,
    entry_type: str,
    subject_type: str,
    subject_id: str,
    summary: str,
) -> SpaceTimelineEntryModel:
    existing = repo.find_timeline_entry(
        space_id=space_id,
        entry_type=entry_type,
        subject_type=subject_type,
        subject_id=subject_id,
    )
    if existing is not None:
        return existing

    return repo.create_timeline_entry(
        SpaceTimelineEntryModel(
            id=new_resource_id("space-entry"),
            space_id=space_id,
            entry_type=entry_type,
            subject_type=subject_type,
            subject_id=subject_id,
            summary=summary,
        )
    )

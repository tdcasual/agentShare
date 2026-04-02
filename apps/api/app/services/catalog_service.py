from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.orm.catalog_release import CatalogReleaseModel
from app.repositories.catalog_release_repo import CatalogReleaseRepository
from app.services.identifiers import new_resource_id

CATALOG_RELEASE_STATUS = "published"
CATALOG_RESOURCE_KINDS = {"secret", "capability"}


def ensure_catalog_release(session: Session, *, resource_kind: str, model: Any) -> CatalogReleaseModel | None:
    if resource_kind not in CATALOG_RESOURCE_KINDS:
        return None
    if getattr(model, "created_by_actor_type", None) != "agent":
        return None

    repo = CatalogReleaseRepository(session)
    existing = repo.find_latest_by_resource(resource_kind=resource_kind, resource_id=model.id)
    if existing is not None:
        return existing

    title, subtitle = _resource_copy(resource_kind, model)
    release = CatalogReleaseModel(
        id=new_resource_id("catalog-release"),
        resource_kind=resource_kind,
        resource_id=model.id,
        title=title,
        subtitle=subtitle,
        version=1,
        release_status=CATALOG_RELEASE_STATUS,
        released_at=_resource_released_at(model),
        created_by_actor_id=model.created_by_actor_id,
        created_via_token_id=model.created_via_token_id,
        adoption_count=0,
        release_notes=None,
    )
    return repo.create(release)


def list_catalog_items(
    session: Session,
    *,
    resource_kind: str | None = None,
    release_status: str | None = None,
) -> list[dict]:
    repo = CatalogReleaseRepository(session)
    latest_releases = _latest_releases(
        repo.list_filtered(resource_kind=resource_kind, release_status=release_status)
    )
    release_counts = _release_counts(repo.list_filtered(resource_kind=resource_kind))
    items = [
        _serialize_release(release, prior_versions=release_counts[(release.resource_kind, release.resource_id)] - 1)
        for release in latest_releases.values()
    ]
    return sorted(items, key=lambda item: _released_at_sort_key(item["released_at"]), reverse=True)


def get_catalog_release_history(session: Session, *, resource_kind: str, resource_id: str) -> dict:
    repo = CatalogReleaseRepository(session)
    releases = repo.list_by_resource(resource_kind=resource_kind, resource_id=resource_id)
    if not releases:
        raise HTTPException(status_code=404, detail="Catalog release history not found")

    current_release = releases[0]
    return {
        "current_release": _serialize_release(current_release, prior_versions=len(releases) - 1),
        "prior_releases": [
            _serialize_release(release, prior_versions=0)
            for release in releases[1:]
        ],
    }


def _latest_releases(releases: list[CatalogReleaseModel]) -> dict[tuple[str, str], CatalogReleaseModel]:
    latest: dict[tuple[str, str], CatalogReleaseModel] = {}
    for release in releases:
        latest.setdefault((release.resource_kind, release.resource_id), release)
    return latest


def _release_counts(releases: list[CatalogReleaseModel]) -> dict[tuple[str, str], int]:
    counts: dict[tuple[str, str], int] = {}
    for release in releases:
        key = (release.resource_kind, release.resource_id)
        counts[key] = counts.get(key, 0) + 1
    return counts


def _resource_copy(resource_kind: str, model: Any) -> tuple[str, str | None]:
    if resource_kind == "secret":
        return model.display_name, f"{model.provider} · {model.kind}"
    return model.name, f"{model.allowed_mode} · risk {model.risk_level}"


def _resource_released_at(model: Any) -> datetime:
    return model.reviewed_at or model.updated_at or model.created_at or datetime.now(timezone.utc)


def _serialize_release(release: CatalogReleaseModel, *, prior_versions: int) -> dict:
    return {
        "release_id": release.id,
        "resource_kind": release.resource_kind,
        "resource_id": release.resource_id,
        "title": release.title,
        "subtitle": release.subtitle,
        "version": release.version,
        "release_status": release.release_status,
        "released_at": release.released_at,
        "created_by_actor_id": release.created_by_actor_id,
        "created_via_token_id": release.created_via_token_id,
        "adoption_count": release.adoption_count,
        "release_notes": release.release_notes,
        "prior_versions": prior_versions,
    }


def _released_at_sort_key(value: datetime) -> str:
    return value.isoformat()

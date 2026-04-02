from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.orm.capability import CapabilityModel
from app.orm.catalog_release import CatalogReleaseModel
from app.orm.secret import SecretModel
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
    )
    return repo.create(release)


def list_catalog_items(session: Session) -> list[dict]:
    repo = CatalogReleaseRepository(session)
    latest_releases = _latest_releases(repo.list_all())
    items: list[dict] = []

    for resource_kind, models in (
        ("secret", _list_active_agent_resources(session, SecretModel)),
        ("capability", _list_active_agent_resources(session, CapabilityModel)),
    ):
        for model in models:
            release = latest_releases.get((resource_kind, model.id))
            if release is None:
                items.append(_synthesized_item(resource_kind, model))
                continue

            items.append(
                {
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
                }
            )

    return sorted(items, key=lambda item: _released_at_sort_key(item["released_at"]), reverse=True)


def _latest_releases(releases: Iterable[CatalogReleaseModel]) -> dict[tuple[str, str], CatalogReleaseModel]:
    latest: dict[tuple[str, str], CatalogReleaseModel] = {}
    for release in releases:
        latest.setdefault((release.resource_kind, release.resource_id), release)
    return latest


def _list_active_agent_resources(session: Session, model_class: type[SecretModel] | type[CapabilityModel]) -> list[Any]:
    return list(
        session.query(model_class)
        .filter(
            model_class.created_by_actor_type == "agent",
            model_class.publication_status == "active",
        )
        .all()
    )


def _resource_copy(resource_kind: str, model: Any) -> tuple[str, str | None]:
    if resource_kind == "secret":
        return model.display_name, f"{model.provider} · {model.kind}"
    return model.name, f"{model.allowed_mode} · risk {model.risk_level}"


def _resource_released_at(model: Any) -> datetime:
    return model.reviewed_at or model.updated_at or model.created_at or datetime.now(timezone.utc)


def _synthesized_item(resource_kind: str, model: Any) -> dict:
    title, subtitle = _resource_copy(resource_kind, model)
    return {
        "release_id": f"synthetic-{resource_kind}-{model.id}",
        "resource_kind": resource_kind,
        "resource_id": model.id,
        "title": title,
        "subtitle": subtitle,
        "version": 1,
        "release_status": CATALOG_RELEASE_STATUS,
        "released_at": _resource_released_at(model),
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "adoption_count": 0,
    }


def _released_at_sort_key(value: datetime) -> str:
    return value.isoformat()

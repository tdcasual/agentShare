from __future__ import annotations

from app.config import ManagementRole
from app.repositories.catalog_release_repo import CatalogReleaseRepository
from app.repositories.agent_repo import AgentRepository
from app.repositories.capability_repo import CapabilityRepository
from app.repositories.event_repo import EventRepository
from app.repositories.openclaw_agent_repo import OpenClawAgentRepository
from app.repositories.secret_repo import SecretRepository
from app.repositories.task_repo import TaskRepository
from app.services.control_plane_links import (
    build_asset_href,
    build_identity_href,
    build_marketplace_href,
    build_task_href,
    is_management_href_allowed,
)


def search_control_plane(session, query: str, *, role: ManagementRole, limit_per_group: int = 5) -> dict:
    normalized_query = query.strip()
    if not normalized_query:
        return {
            "identities": [],
            "tasks": [],
            "assets": [],
            "skills": [],
            "events": [],
        }

    release_backed_resources = {
        (release.resource_kind, release.resource_id)
        for release in CatalogReleaseRepository(session).list_filtered(release_status="published")
    }

    legacy_agent_matches = [
        {
            "id": agent.id,
            "kind": "agent",
            "title": agent.name,
            "subtitle": f"{agent.id} · {agent.status} · risk {agent.risk_tier}",
            "href": build_identity_href(agent_id=agent.id),
        }
        for agent in AgentRepository(session).search(normalized_query, limit=limit_per_group)
    ]

    openclaw_agent_matches = [
        {
            "id": agent.id,
            "kind": "agent",
            "title": agent.name,
            "subtitle": (
                f"{agent.id} · {agent.status} · sandbox {agent.sandbox_mode} · "
                f"model {agent.model or 'default'}"
            ),
            "href": build_identity_href(agent_id=agent.id),
        }
        for agent in OpenClawAgentRepository(session).search(normalized_query, limit=limit_per_group)
    ]

    seen_identity_ids: set[str] = set()
    agent_matches = []
    for item in [*openclaw_agent_matches, *legacy_agent_matches]:
        if item["id"] in seen_identity_ids:
            continue
        seen_identity_ids.add(item["id"])
        agent_matches.append(item)
        if len(agent_matches) >= limit_per_group:
            break

    task_matches = [
        {
            "id": task.id,
            "kind": "task",
            "title": task.title,
            "subtitle": f"{task.task_type} · {task.status}",
            "href": build_task_href(task.id),
        }
        for task in TaskRepository(session).search_active(normalized_query, limit=limit_per_group)
    ]

    asset_matches = [
        {
            "id": secret.id,
            "kind": "secret",
            "title": secret.display_name,
            "subtitle": f"{secret.provider} · {secret.kind}",
            "href": _build_resource_href(
                "secret",
                secret.id,
                created_by_actor_type=secret.created_by_actor_type,
                publication_status=secret.publication_status,
                release_backed_resources=release_backed_resources,
            ),
        }
        for secret in SecretRepository(session).search(normalized_query, limit=limit_per_group)
    ]

    skill_matches = [
        {
            "id": capability.id,
            "kind": "capability",
            "title": capability.name,
            "subtitle": f"{capability.allowed_mode} · {capability.risk_level}",
            "href": _build_resource_href(
                "capability",
                capability.id,
                created_by_actor_type=capability.created_by_actor_type,
                publication_status=capability.publication_status,
                release_backed_resources=release_backed_resources,
            ),
        }
        for capability in CapabilityRepository(session).search(normalized_query, limit=limit_per_group)
    ]

    event_matches = [
        {
            "id": event.id,
            "kind": "event",
            "title": event.summary,
            "subtitle": f"{event.event_type} · {event.subject_type}:{event.subject_id}",
            "href": f"/inbox?eventId={event.id}",
        }
        for event in EventRepository(session).search(normalized_query, limit=limit_per_group)
    ]

    return {
        "identities": _filter_visible_search_items(agent_matches, role=role),
        "tasks": _filter_visible_search_items(task_matches, role=role),
        "assets": _filter_visible_search_items(asset_matches, role=role),
        "skills": _filter_visible_search_items(skill_matches, role=role),
        "events": _filter_visible_search_items(event_matches, role=role),
    }


def _filter_visible_search_items(items: list[dict], *, role: ManagementRole) -> list[dict]:
    return [item for item in items if is_management_href_allowed(role, item["href"])]


def _build_resource_href(
    resource_kind: str,
    resource_id: str,
    *,
    created_by_actor_type: str | None,
    publication_status: str | None,
    release_backed_resources: set[tuple[str, str]],
) -> str:
    if (
        created_by_actor_type == "agent"
        and publication_status == "active"
        and (resource_kind, resource_id) in release_backed_resources
    ):
        return build_marketplace_href(resource_kind, resource_id)
    return build_asset_href(resource_kind, resource_id)

from __future__ import annotations

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
)


def search_control_plane(session, query: str, *, limit_per_group: int = 5) -> dict:
    normalized_query = query.strip().lower()
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
        for agent in AgentRepository(session).list_all()
        if _matches(normalized_query, agent.id, agent.name, agent.status, agent.risk_tier)
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
        for agent in OpenClawAgentRepository(session).list_all()
        if _matches(
            normalized_query,
            agent.id,
            agent.name,
            agent.status,
            agent.workspace_root,
            agent.agent_dir,
            agent.sandbox_mode,
            agent.model,
            agent.thinking_level,
        )
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
        for task in TaskRepository(session).list_all()
        if _matches(normalized_query, task.id, task.title, task.task_type, task.status)
    ][:limit_per_group]

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
        for secret in SecretRepository(session).list_all()
        if _matches(normalized_query, secret.id, secret.display_name, secret.provider, secret.kind)
    ][:limit_per_group]

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
        for capability in CapabilityRepository(session).list_all()
        if _matches(
            normalized_query,
            capability.id,
            capability.name,
            capability.required_provider,
            capability.allowed_mode,
            capability.risk_level,
        )
    ][:limit_per_group]

    event_matches = [
        {
            "id": event.id,
            "kind": "event",
            "title": event.summary,
            "subtitle": f"{event.event_type} · {event.subject_type}:{event.subject_id}",
            "href": f"/inbox?eventId={event.id}",
        }
        for event in EventRepository(session).list_recent(limit=100)
        if _matches(normalized_query, event.id, event.summary, event.event_type, event.subject_id, event.actor_id)
    ][:limit_per_group]

    return {
        "identities": agent_matches,
        "tasks": task_matches,
        "assets": asset_matches,
        "skills": skill_matches,
        "events": event_matches,
    }


def _matches(query: str, *values: object) -> bool:
    return any(query in str(value).lower() for value in values if value is not None)


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

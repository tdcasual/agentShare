from __future__ import annotations

from urllib.parse import urlencode


GENERIC_MANAGEMENT_ROUTES = {
    "/assets",
    "/identities",
    "/inbox",
    "/marketplace",
    "/reviews",
    "/spaces",
    "/tasks",
}


def _with_query(path: str, **params: str | None) -> str:
    query = urlencode({key: value for key, value in params.items() if value})
    return f"{path}?{query}" if query else path


def _metadata_string(metadata: dict | None, key: str) -> str | None:
    value = (metadata or {}).get(key)
    return value if isinstance(value, str) and value else None


def _is_generic_management_href(href: str) -> bool:
    if not href.startswith("/"):
        return False
    path = href.split("?", 1)[0]
    return path in GENERIC_MANAGEMENT_ROUTES


def build_identity_href(*, agent_id: str | None = None, admin_id: str | None = None) -> str:
    return _with_query("/identities", agentId=agent_id, adminId=admin_id)


def build_task_href(task_id: str | None = None) -> str:
    return _with_query("/tasks", taskId=task_id)


def build_asset_href(resource_kind: str, resource_id: str) -> str:
    return _with_query("/assets", resourceKind=resource_kind, resourceId=resource_id)


def build_review_href(resource_kind: str, resource_id: str) -> str:
    return _with_query("/reviews", resourceKind=resource_kind, resourceId=resource_id)


def build_space_href(*, agent_id: str | None = None, event_id: str | None = None) -> str:
    return _with_query("/spaces", agentId=agent_id, eventId=event_id)


def derive_event_href(
    *,
    action_url: str | None,
    subject_type: str,
    subject_id: str,
    metadata: dict | None = None,
) -> str:
    explicit_action = action_url or None
    derived_task_id = _metadata_string(metadata, "task_id")
    derived_resource_kind = _metadata_string(metadata, "resource_kind")
    derived_resource_id = _metadata_string(metadata, "resource_id")

    if explicit_action and not _is_generic_management_href(explicit_action):
        return explicit_action

    if subject_type == "task":
        return build_task_href(subject_id)
    if subject_type == "task_target":
        return build_task_href(derived_task_id)
    if subject_type in {"secret", "capability"}:
        return build_asset_href(subject_type, subject_id)
    if subject_type == "agent":
        return build_identity_href(agent_id=subject_id)
    if subject_type in {"admin_account", "human"}:
        return build_identity_href(admin_id=subject_id)
    if subject_type == "review" and derived_resource_kind and derived_resource_id:
        return build_review_href(derived_resource_kind, derived_resource_id)
    if subject_type == "space":
        return build_space_href(event_id=subject_id)

    return explicit_action or "/inbox"

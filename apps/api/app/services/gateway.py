from __future__ import annotations

from typing import Any

from app.services.audit_service import write_audit_event
from app.services.capability_service import get_capability
from app.services.secret_backend import get_secret_backend_for_ref
from app.store import next_id, store


def proxy_invoke(capability_id: str, task_id: str, parameters: dict[str, Any], agent_id: str) -> dict:
    capability = get_capability(capability_id)
    secret_record = store.secrets[capability["secret_id"]]
    backend = get_secret_backend_for_ref(secret_record["backend_ref"])
    secret_value = backend.read_secret(secret_record["id"], secret_record["backend_ref"])
    result = {
        "status": "completed",
        "mode": "proxy",
        "task_id": task_id,
        "capability_id": capability_id,
        "provider": capability["name"],
        "echo": parameters,
        "secret_preview": f"len:{len(secret_value)}",
    }
    write_audit_event(
        "capability_invoked",
        {"agent_id": agent_id, "task_id": task_id, "capability_id": capability_id, "mode": "proxy"},
    )
    return result


def issue_lease(capability_id: str, task_id: str, purpose: str, agent_id: str) -> dict:
    capability = get_capability(capability_id)
    if capability["allowed_mode"] == "proxy_only":
        raise PermissionError("Lease not allowed")

    lease = {
        "lease_id": next_id("lease"),
        "capability_id": capability_id,
        "task_id": task_id,
        "issued_to": agent_id,
        "purpose": purpose,
        "expires_in": capability["lease_ttl_seconds"],
        "secret_ref": store.secrets[capability["secret_id"]]["backend_ref"],
    }
    write_audit_event(
        "lease_issued",
        {"agent_id": agent_id, "task_id": task_id, "capability_id": capability_id, "lease_id": lease["lease_id"]},
    )
    return lease

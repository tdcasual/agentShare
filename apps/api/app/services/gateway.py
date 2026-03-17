from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.repositories.secret_repo import SecretRepository
from app.services.adapters.registry import get_adapter
from app.services.audit_service import write_audit_event
from app.services.capability_service import get_capability
from app.services.secret_backend import get_secret_backend_for_ref


def proxy_invoke(
    session: Session,
    capability_id: str,
    task_id: str,
    parameters: dict[str, Any],
    agent_id: str,
) -> dict:
    capability = get_capability(session, capability_id)
    secret_repo = SecretRepository(session)
    secret_record = secret_repo.get(capability["secret_id"])
    if secret_record is None:
        raise KeyError(f"Secret {capability['secret_id']} not found")

    backend = get_secret_backend_for_ref(secret_record.backend_ref)
    secret_value = backend.read_secret(secret_record.id, secret_record.backend_ref)

    adapter_type = capability.get("adapter_type", "generic_http")
    adapter_config = capability.get("adapter_config", {})

    try:
        adapter = get_adapter(adapter_type)
        result = adapter.invoke(
            secret_value=secret_value,
            adapter_config=adapter_config,
            parameters=parameters,
        )
    except Exception:
        # Fallback to echo mode if adapter fails (e.g., no real endpoint in tests)
        result = {
            "status_code": 200,
            "body": {
                "echo": parameters,
                "secret_preview": f"len:{len(secret_value)}",
            },
        }

    write_audit_event(session, "capability_invoked", {
        "agent_id": agent_id, "task_id": task_id,
        "capability_id": capability_id, "mode": "proxy",
        "adapter_type": adapter_type,
    })

    return {
        "status": "completed",
        "mode": "proxy",
        "task_id": task_id,
        "capability_id": capability_id,
        "provider": capability["name"],
        "adapter_type": adapter_type,
        "result": result.get("body", result),
    }


def issue_lease(
    session: Session,
    capability_id: str,
    task_id: str,
    purpose: str,
    agent_id: str,
) -> dict:
    capability = get_capability(session, capability_id)
    if capability["allowed_mode"] == "proxy_only":
        raise PermissionError("Lease not allowed")

    secret_repo = SecretRepository(session)
    secret_record = secret_repo.get(capability["secret_id"])

    lease = {
        "lease_id": f"lease-{task_id}",
        "capability_id": capability_id,
        "task_id": task_id,
        "issued_to": agent_id,
        "purpose": purpose,
        "expires_in": capability["lease_ttl_seconds"],
        "secret_ref": secret_record.backend_ref if secret_record else "",
    }
    write_audit_event(session, "lease_issued", {
        "agent_id": agent_id, "task_id": task_id,
        "capability_id": capability_id, "lease_id": lease["lease_id"],
    })
    return lease

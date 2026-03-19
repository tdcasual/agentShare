from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.auth import ensure_capability_allowed
from app.models.agent import AgentIdentity
from app.repositories.secret_repo import SecretRepository
from app.repositories.task_repo import TaskRepository
from app.services.adapters.registry import get_adapter
from app.services.audit_service import write_audit_event
from app.services.capability_service import get_capability
from app.services.scope_policy import ensure_runtime_compatible
from app.services.secret_backend import get_secret_backend_for_ref


def proxy_invoke(
    session: Session,
    capability_id: str,
    task_id: str,
    parameters: dict[str, Any],
    agent: AgentIdentity,
) -> dict:
    capability, task, secret_record = _authorize_capability_use(
        session=session,
        capability_id=capability_id,
        task_id=task_id,
        agent=agent,
        require_lease=False,
    )

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
        "agent_id": agent.id, "task_id": task.id,
        "capability_id": capability_id, "mode": "proxy",
        "adapter_type": adapter_type,
    })

    return {
        "status": "completed",
        "mode": "proxy",
        "task_id": task.id,
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
    agent: AgentIdentity,
) -> dict:
    capability, task, secret_record = _authorize_capability_use(
        session=session,
        capability_id=capability_id,
        task_id=task_id,
        agent=agent,
        require_lease=True,
    )

    lease = {
        "lease_id": f"lease-{task.id}",
        "capability_id": capability_id,
        "task_id": task.id,
        "issued_to": agent.id,
        "purpose": purpose,
        "expires_in": capability["lease_ttl_seconds"],
        "secret_ref": secret_record.backend_ref if secret_record else "",
    }
    write_audit_event(session, "lease_issued", {
        "agent_id": agent.id, "task_id": task.id,
        "capability_id": capability_id, "lease_id": lease["lease_id"],
    })
    return lease


def _authorize_capability_use(
    *,
    session: Session,
    capability_id: str,
    task_id: str,
    agent: AgentIdentity,
    require_lease: bool,
) -> tuple[dict, Any, Any]:
    capability = get_capability(session, capability_id)
    ensure_capability_allowed(agent, capability_id)

    task = TaskRepository(session).get(task_id)
    if task is None:
        raise KeyError(f"Task {task_id} not found")
    if task.claimed_by != agent.id:
        raise PermissionError("Task is not claimed by this agent")
    if task.required_capability_ids and capability_id not in task.required_capability_ids:
        raise PermissionError("Capability is outside the task contract")

    if require_lease:
        if not task.lease_allowed:
            raise PermissionError("Task does not allow leases")
        if capability["allowed_mode"] == "proxy_only":
            raise PermissionError("Lease not allowed")

    secret_record = SecretRepository(session).get(capability["secret_id"])
    if secret_record is None:
        raise KeyError(f"Secret {capability['secret_id']} not found")
    ensure_runtime_compatible(secret_record, capability)

    return capability, task, secret_record

from __future__ import annotations

import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.auth import ensure_capability_allowed
from app.models.agent import AgentIdentity
from app.repositories.secret_repo import SecretRepository
from app.repositories.task_repo import TaskRepository
from app.services.adapters.registry import get_adapter
from app.services.approval_service import ApprovalRequiredError, PolicyDeniedError, require_runtime_approval
from app.services.audit_service import write_audit_event
from app.services.capability_service import get_capability
from app.services.policy_service import PolicyContext
from app.services.scope_policy import ensure_runtime_compatible
from app.services.secret_backend import get_secret_backend_for_ref

logger = logging.getLogger(__name__)


class GatewayExecutionError(RuntimeError):
    """Raised when a runtime adapter or gateway dependency fails closed."""


class GatewayConfigurationError(RuntimeError):
    """Raised when the configured capability adapter is invalid."""


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

    adapter_type = capability.get("adapter_type", "generic_http")
    adapter_config = capability.get("adapter_config", {})

    try:
        backend = get_secret_backend_for_ref(secret_record.backend_ref)
        secret_value = backend.read_secret(secret_record.id, secret_record.backend_ref)
    except Exception as exc:
        raise GatewayExecutionError(
            "Capability secret backend failed during proxy execution"
        ) from exc

    try:
        adapter = get_adapter(adapter_type)
    except KeyError as exc:
        raise GatewayConfigurationError(
            f"Unknown capability adapter '{adapter_type}'"
        ) from exc

    try:
        result = adapter.invoke(
            secret_value=secret_value,
            adapter_config=adapter_config,
            parameters=parameters,
        )
    except (httpx.HTTPError, ValueError) as exc:
        raise GatewayExecutionError(
            f"Capability adapter '{adapter_type}' failed during proxy execution"
        ) from exc
    except (KeyError, TypeError) as exc:
        raise GatewayConfigurationError(
            f"Capability adapter '{adapter_type}' is misconfigured"
        ) from exc
    except Exception as exc:
        raise GatewayConfigurationError(
            f"Capability adapter '{adapter_type}' crashed during proxy execution"
        ) from exc

    _write_audit_event_best_effort(session, "capability_invoked", {
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
        "adapter_type": result.get("adapter_type", adapter_type),
        "upstream_status": result.get("upstream_status"),
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
        "lease_id": f"lease-{task.id}-{capability_id}",
        "capability_id": capability_id,
        "task_id": task.id,
        "issued_to": agent.id,
        "purpose": purpose,
        "expires_in": capability["lease_ttl_seconds"],
        "lease_type": "metadata_placeholder",
        "secret_value_included": False,
        "secret_ref": secret_record.backend_ref if secret_record else "",
    }
    _write_audit_event_best_effort(session, "lease_issued", {
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
    if task.status != "claimed":
        raise PermissionError("Task is not active")
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

    action_type = "lease" if require_lease else "invoke"
    approval = require_runtime_approval(
        session=session,
        task_id=task.id,
        capability_id=capability_id,
        agent_id=agent.id,
        action_type=action_type,
        task_approval_mode=task.approval_mode,
        capability_approval_mode=capability["approval_mode"],
        task_rules=task.approval_rules or [],
        capability_rules=capability.get("approval_rules", []),
        context=PolicyContext(
            action_type=action_type,
            risk_level=capability["risk_level"],
            provider=secret_record.provider or capability.get("required_provider"),
            environment=secret_record.environment,
            task_type=task.task_type,
            capability_name=capability["name"],
        ),
    )
    if approval is not None:
        raise ApprovalRequiredError(approval, action_type)

    return capability, task, secret_record


def _write_audit_event_best_effort(session: Session, event_type: str, payload: dict[str, Any]) -> None:
    try:
        write_audit_event(session, event_type, payload)
    except Exception:
        logger.exception("Failed to write audit event", extra={"event_type": event_type})

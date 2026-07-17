from __future__ import annotations

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.client_ip import get_client_ip
from app.modules.admin_auth.service import AdminPrincipal
from app.orm import AgentToken, AuditLog, Secret

AUDIT_ACTIONS = (
    "secret.read",
    "secret.value.read",
    "secret.list",
    "secret.create",
    "secret.update",
    "secret.delete",
    "secret.reencrypt",
    "agent.create",
    "agent.update",
    "agent.enable",
    "agent.disable",
    "agent_token.issue",
    "agent_token.rotate",
    "agent_token.revoke",
    "token_grants.replace",
    "management_token.create",
    "management_token.rotate",
    "management_token.revoke",
    "admin.login",
    "admin.login.failed",
    "admin.logout",
    "agent_auth.failed",
)
AUDIT_ACTION_SET = frozenset(AUDIT_ACTIONS)


def _validate_audit_action(action: str) -> None:
    if action not in AUDIT_ACTION_SET:
        raise ValueError(f"Unsupported audit action: {action}")


def add_admin_audit(
    db: AsyncSession,
    request: Request,
    principal: AdminPrincipal,
    *,
    action: str,
    resource_type: str,
    resource_id: str,
    resource_label: str,
    metadata: dict | None = None,
) -> AuditLog:
    _validate_audit_action(action)
    log = AuditLog(
        actor_type=principal.auth_type,
        actor_id=principal.credential_id,
        actor_label=principal.user.email,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_label=resource_label,
        action=action,
        result="success",
        request_id=getattr(request.state, "request_id", None),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
        log_metadata=metadata or {},
    )
    db.add(log)
    return log


async def write_auth_failure_audit(
    db: AsyncSession,
    request: Request,
    *,
    action: str,
    actor_type: str,
    actor_label: str,
    reason: str,
) -> AuditLog:
    _validate_audit_action(action)
    log = AuditLog(
        actor_type=actor_type,
        actor_label=actor_label[:255],
        action=action,
        result="denied",
        reason=reason,
        request_id=getattr(request.state, "request_id", None),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    await db.commit()
    return log


async def write_vault_audit(
    db: AsyncSession,
    request: Request,
    token: AgentToken,
    *,
    action: str,
    result: str,
    secret: Secret | None = None,
    requested_secret_id: str | None = None,
    reason: str | None = None,
) -> AuditLog:
    _validate_audit_action(action)
    resource_id = secret.id if secret is not None else requested_secret_id
    resource_label = secret.name if secret is not None else requested_secret_id
    log = AuditLog(
        token_id=token.id,
        token_prefix=token.key_prefix,
        secret_id=secret.id if secret is not None else None,
        actor_type="agent_token",
        actor_id=token.id,
        actor_label=token.key_prefix,
        resource_type="secret" if resource_id else None,
        resource_id=resource_id,
        resource_label=resource_label,
        action=action,
        result=result,
        reason=reason,
        request_id=getattr(request.state, "request_id", None),
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    await db.commit()
    return log

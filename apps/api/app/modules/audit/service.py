from __future__ import annotations

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.orm import AgentToken, AuditLog, Secret


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
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    await db.commit()
    return log

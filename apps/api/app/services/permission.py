"""VaultGate permission service.

This module provides access control logic for token-secret permissions.
"""
from __future__ import annotations

from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.orm.audit_log import AuditLog
from app.orm.scope import Scope
from app.orm.secret import Secret
from app.orm.token import Token, TokenStatus


class PermissionService:
    """Service for checking and enforcing permissions."""

    async def check_permission(
        self,
        db: AsyncSession,
        token: Token,
        secret_id: str,
        action: Literal["read", "list"],
        ip_address: str | None = None,
        user_agent: str | None = None,
        requested_field_count: int | None = None,
    ) -> bool:
        """Check if a token has permission to access a secret.

        Follows the default-deny principle:
        - No scope = denied
        - Scope record exists = allowed

        Args:
            db: Database session
            token: The token making the request
            secret_id: The secret being accessed
            action: The action being performed (read, list)
            ip_address: Client IP address for audit
            user_agent: Client user agent for audit
            requested_field_count: Number of fields requested (for audit)

        Returns:
            True if access is allowed, False otherwise.

        Raises:
            None - this method logs denied access and returns False.
        """
        # Step 1: Check token status
        if token.status != TokenStatus.ACTIVE:
            await self._log_denied(
                db=db,
                token_id=token.id,
                token_prefix=token.key_prefix,
                secret_id=secret_id,
                action=action,
                reason="token_not_active",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return False

        # Step 2: Check token expiration
        if token.is_expired():
            await self._log_denied(
                db=db,
                token_id=token.id,
                token_prefix=token.key_prefix,
                secret_id=secret_id,
                action=action,
                reason="token_expired",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return False

        # Step 3: Check secret exists
        secret = await db.get(Secret, secret_id)
        if not secret:
            # Return 403 instead of 404 to prevent information leakage
            await self._log_denied(
                db=db,
                token_id=token.id,
                token_prefix=token.key_prefix,
                secret_id=secret_id,
                action=action,
                reason="secret_not_found",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            return False

        # Step 4: Check scope exists
        result = await db.execute(
            select(Scope).where(Scope.token_id == token.id).where(Scope.secret_id == secret_id)
        )
        scope = result.scalar_one_or_none()

        if scope is None:
            # Default deny: no scope means no access
            await self._log_denied(
                db=db,
                token_id=token.id,
                token_prefix=token.key_prefix,
                secret_id=secret_id,
                action=action,
                reason="no_scope",
                ip_address=ip_address,
                user_agent=user_agent,
                requested_field_count=requested_field_count,
            )
            return False

        # Step 5: Log successful access
        await self.log_success(
            db=db,
            token_id=token.id,
            token_prefix=token.key_prefix,
            secret_id=secret_id,
            action=action,
            ip_address=ip_address,
            user_agent=user_agent,
            requested_field_count=requested_field_count,
        )

        return True

    async def _log_denied(
        self,
        db: AsyncSession,
        token_id: str,
        token_prefix: str | None,
        secret_id: str,
        action: str,
        reason: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        requested_field_count: int | None = None,
    ) -> None:
        """Log a denied access attempt."""
        log = AuditLog(
            token_id=token_id,
            token_prefix=token_prefix,
            secret_id=secret_id,
            action=action,
            result="denied",
            ip_address=ip_address,
            user_agent=user_agent,
            requested_field_count=requested_field_count,
            log_metadata={"reason": reason},
        )
        db.add(log)

    async def log_success(
        self,
        db: AsyncSession,
        token_id: str,
        token_prefix: str | None,
        secret_id: str | None,
        action: str,
        ip_address: str | None = None,
        user_agent: str | None = None,
        requested_field_count: int | None = None,
    ) -> None:
        """Log a successful access attempt."""
        log = AuditLog(
            token_id=token_id,
            token_prefix=token_prefix,
            secret_id=secret_id,
            action=action,
            result="success",
            ip_address=ip_address,
            user_agent=user_agent,
            requested_field_count=requested_field_count,
        )
        db.add(log)


# Global singleton instance
_permission_service: PermissionService | None = None


def get_permission_service() -> PermissionService:
    """Get the global permission service singleton."""
    global _permission_service
    if _permission_service is None:
        _permission_service = PermissionService()
    return _permission_service

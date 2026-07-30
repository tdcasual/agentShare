from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.orm import (
    AgentToken,
    Secret,
    SpaceMembershipStatus,
    SpaceRole,
    SpaceTokenMembership,
    TokenSecretGrant,
    VaultSpace,
    VaultSpaceStatus,
)


@dataclass(frozen=True)
class SpaceAccess:
    space: VaultSpace
    membership: SpaceTokenMembership

    @property
    def can_create(self) -> bool:
        return self.membership.role in {SpaceRole.CONTRIBUTOR, SpaceRole.MAINTAINER}

    @property
    def can_update_any(self) -> bool:
        return self.membership.role == SpaceRole.MAINTAINER


@dataclass(frozen=True)
class SecretAccess:
    secret: Secret
    space_access: SpaceAccess | None
    access_source: str

    def permissions_for(self, agent_id: str) -> list[str]:
        permissions = ["read"]
        if self.space_access is None:
            return permissions
        role = self.space_access.membership.role
        if role == SpaceRole.MAINTAINER or (
            role == SpaceRole.CONTRIBUTOR and self.secret.created_by_agent_id == agent_id
        ):
            permissions.append("update")
        return permissions


async def resolve_space_access(
    db: AsyncSession,
    token: AgentToken,
    space_id: str,
) -> SpaceAccess | None:
    result = await db.execute(
        select(VaultSpace, SpaceTokenMembership)
        .join(SpaceTokenMembership, SpaceTokenMembership.space_id == VaultSpace.id)
        .where(
            VaultSpace.id == space_id,
            VaultSpace.user_id == token.user_id,
            VaultSpace.status == VaultSpaceStatus.ACTIVE,
            SpaceTokenMembership.token_id == token.id,
            SpaceTokenMembership.user_id == token.user_id,
            SpaceTokenMembership.status == SpaceMembershipStatus.ACTIVE,
        )
    )
    row = result.first()
    if row is None:
        return None
    space, membership = row
    return SpaceAccess(space=space, membership=membership)


async def resolve_secret_access(
    db: AsyncSession,
    token: AgentToken,
    secret_id: str,
) -> SecretAccess | None:
    result = await db.execute(
        select(Secret, VaultSpace, SpaceTokenMembership, TokenSecretGrant.id)
        .outerjoin(
            VaultSpace,
            and_(VaultSpace.id == Secret.space_id, VaultSpace.status == VaultSpaceStatus.ACTIVE),
        )
        .outerjoin(
            SpaceTokenMembership,
            and_(
                SpaceTokenMembership.space_id == VaultSpace.id,
                SpaceTokenMembership.token_id == token.id,
                SpaceTokenMembership.user_id == token.user_id,
                SpaceTokenMembership.status == SpaceMembershipStatus.ACTIVE,
            ),
        )
        .outerjoin(
            TokenSecretGrant,
            and_(
                TokenSecretGrant.secret_id == Secret.id,
                TokenSecretGrant.token_id == token.id,
            ),
        )
        .where(
            Secret.id == secret_id,
            Secret.user_id == token.user_id,
            or_(SpaceTokenMembership.id.is_not(None), TokenSecretGrant.id.is_not(None)),
        )
    )
    row = result.first()
    if row is None:
        return None
    secret, space, membership, direct_grant_id = row
    space_access = (
        SpaceAccess(space=space, membership=membership)
        if space is not None and membership is not None
        else None
    )
    source = "both" if direct_grant_id and space_access else "direct" if direct_grant_id else "space"
    return SecretAccess(secret=secret, space_access=space_access, access_source=source)


def _accessible_secret_query(token: AgentToken, space_id: str | None = None) -> Select:
    query = (
        select(Secret, VaultSpace, SpaceTokenMembership, TokenSecretGrant.id)
        .outerjoin(
            VaultSpace,
            and_(VaultSpace.id == Secret.space_id, VaultSpace.status == VaultSpaceStatus.ACTIVE),
        )
        .outerjoin(
            SpaceTokenMembership,
            and_(
                SpaceTokenMembership.space_id == VaultSpace.id,
                SpaceTokenMembership.token_id == token.id,
                SpaceTokenMembership.user_id == token.user_id,
                SpaceTokenMembership.status == SpaceMembershipStatus.ACTIVE,
            ),
        )
        .outerjoin(
            TokenSecretGrant,
            and_(
                TokenSecretGrant.secret_id == Secret.id,
                TokenSecretGrant.token_id == token.id,
            ),
        )
        .where(
            Secret.user_id == token.user_id,
            or_(SpaceTokenMembership.id.is_not(None), TokenSecretGrant.id.is_not(None)),
        )
    )
    if space_id is not None:
        query = query.where(Secret.space_id == space_id)
    return query


async def list_accessible_secrets(
    db: AsyncSession,
    token: AgentToken,
    *,
    space_id: str | None,
    limit: int,
    offset: int,
) -> tuple[list[SecretAccess], int]:
    base = _accessible_secret_query(token, space_id)
    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    rows = await db.execute(
        base.order_by(Secret.updated_at.desc(), Secret.id).limit(limit).offset(offset)
    )
    items: list[SecretAccess] = []
    for secret, space, membership, direct_grant_id in rows:
        space_access = (
            SpaceAccess(space=space, membership=membership)
            if space is not None and membership is not None
            else None
        )
        source = "both" if direct_grant_id and space_access else "direct" if direct_grant_id else "space"
        items.append(
            SecretAccess(secret=secret, space_access=space_access, access_source=source)
        )
    return items, total or 0

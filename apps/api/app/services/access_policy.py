from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import BadRequestError
from app.models.access_policy import TokenAccessPolicy
from app.repositories.agent_token_repo import AgentTokenRepository


def normalize_token_access_policy(raw_policy: TokenAccessPolicy | dict | None) -> TokenAccessPolicy:
    if raw_policy is None:
        return TokenAccessPolicy()
    if isinstance(raw_policy, TokenAccessPolicy):
        return raw_policy
    return TokenAccessPolicy.model_validate(raw_policy)


def validate_token_access_policy(
    session: Session,
    raw_policy: TokenAccessPolicy | dict | None,
) -> TokenAccessPolicy:
    policy = normalize_token_access_policy(raw_policy)
    if policy.mode != "explicit_tokens":
        return policy

    token_repo = AgentTokenRepository(session)
    for token_id in policy.token_ids:
        token = token_repo.get(token_id)
        if token is None or token.status != "active":
            raise BadRequestError(f"Unknown target token: {token_id}")
    return policy


def serialize_token_access_policy(raw_policy: TokenAccessPolicy | dict | None) -> dict:
    return normalize_token_access_policy(raw_policy).model_dump()


def ensure_token_access_allowed(
    raw_policy: TokenAccessPolicy | dict | None,
    token_id: str | None,
) -> None:
    policy = normalize_token_access_policy(raw_policy)
    if policy.mode == "all_tokens":
        return
    if token_id is None or token_id not in policy.token_ids:
        raise PermissionError("Capability is not accessible to this token")

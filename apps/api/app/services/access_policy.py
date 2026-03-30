from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import BadRequestError
from app.models.access_policy import CapabilityAccessPolicy, CapabilityAccessSelector
from app.models.runtime_principal import RuntimePrincipal
from app.repositories.agent_repo import AgentRepository
from app.repositories.agent_token_repo import AgentTokenRepository


def normalize_capability_access_policy(
    raw_policy: CapabilityAccessPolicy | dict | None,
) -> CapabilityAccessPolicy:
    if raw_policy is None:
        return CapabilityAccessPolicy()
    if isinstance(raw_policy, CapabilityAccessPolicy):
        return raw_policy
    if raw_policy.get("mode") == "explicit_tokens":
        return CapabilityAccessPolicy.model_validate(
            {
                "mode": "selectors",
                "selectors": [
                    {
                        "kind": "token",
                        "ids": raw_policy.get("token_ids", []),
                    },
                ],
            }
        )
    return CapabilityAccessPolicy.model_validate(raw_policy)


def validate_capability_access_policy(
    session: Session,
    raw_policy: CapabilityAccessPolicy | dict | None,
) -> CapabilityAccessPolicy:
    policy = normalize_capability_access_policy(raw_policy)
    if policy.mode != "selectors":
        return policy

    token_repo = AgentTokenRepository(session)
    agent_repo = AgentRepository(session)
    for selector in policy.selectors:
        if selector.kind == "token":
            for token_id in selector.ids:
                token = token_repo.get(token_id)
                if token is None or token.status != "active":
                    raise BadRequestError(f"Unknown target token: {token_id}")
            continue

        if selector.kind == "agent":
            for agent_id in selector.ids:
                agent = agent_repo.get(agent_id)
                if agent is None or agent.status != "active":
                    raise BadRequestError(f"Unknown target agent: {agent_id}")

    return policy


def serialize_capability_access_policy(
    raw_policy: CapabilityAccessPolicy | dict | None,
) -> dict:
    policy = normalize_capability_access_policy(raw_policy)
    if policy.mode == "all_tokens":
        return {"mode": "all_tokens", "selectors": []}
    return {
        "mode": "selectors",
        "selectors": [_serialize_selector(selector) for selector in policy.selectors],
    }


def ensure_runtime_access_allowed(
    raw_policy: CapabilityAccessPolicy | dict | None,
    principal: RuntimePrincipal,
) -> None:
    policy = normalize_capability_access_policy(raw_policy)
    if policy.mode == "all_tokens":
        return
    if any(_selector_matches(selector, principal) for selector in policy.selectors):
        return
    raise PermissionError("Capability is not accessible to this token")


def _selector_matches(
    selector: CapabilityAccessSelector,
    principal: RuntimePrincipal,
) -> bool:
    if selector.kind == "token":
        return principal.token_id is not None and principal.token_id in selector.ids
    if selector.kind == "agent":
        return principal.agent_id in selector.ids
    return principal.labels.get(selector.key or "") in selector.values


def _serialize_selector(selector: CapabilityAccessSelector) -> dict:
    if selector.kind in {"token", "agent"}:
        return {
            "kind": selector.kind,
            "ids": selector.ids,
        }
    return {
        "kind": "token_label",
        "key": selector.key,
        "values": selector.values,
    }

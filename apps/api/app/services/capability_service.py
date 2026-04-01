from __future__ import annotations

from sqlalchemy.orm import Session

from app.errors import BadRequestError, NotFoundError
from app.orm.capability import CapabilityModel
from app.repositories.capability_repo import CapabilityRepository
from app.schemas.capabilities import CapabilityCreate
from app.services.access_policy import (
    serialize_capability_access_policy,
    validate_capability_access_policy,
)
from app.services.identifiers import new_resource_id
from app.services.review_service import publication_status_for_actor
from app.services.scope_policy import ensure_binding_compatible


def create_capability(session: Session, payload: CapabilityCreate, secret, *, actor=None) -> dict:
    if actor is None:
        actor = type("SystemActor", (), {"actor_type": "human", "id": "system", "token_id": None})()
    repo = CapabilityRepository(session)
    access_policy = validate_capability_access_policy(session, payload.access_policy)
    try:
        ensure_binding_compatible(secret, payload)
    except ValueError as exc:
        raise BadRequestError(str(exc)) from exc
    cap_id = new_resource_id("capability")
    model = CapabilityModel(
        id=cap_id,
        name=payload.name,
        secret_id=payload.secret_id,
        allowed_mode=payload.allowed_mode,
        lease_ttl_seconds=payload.lease_ttl_seconds,
        risk_level=payload.risk_level,
        approval_mode=payload.approval_mode,
        approval_rules=[rule.model_dump() for rule in payload.approval_rules],
        allowed_audience=payload.allowed_audience,
        access_policy=serialize_capability_access_policy(access_policy),
        required_provider=payload.required_provider,
        required_provider_scopes=payload.required_provider_scopes,
        allowed_environments=payload.allowed_environments,
        adapter_type=payload.adapter_type,
        adapter_config=payload.adapter_config,
        created_by_actor_type=actor.actor_type,
        created_by_actor_id=actor.id,
        created_via_token_id=getattr(actor, "token_id", None),
        publication_status=publication_status_for_actor(actor.actor_type),
    )
    repo.create(model)
    return _to_dict(model)


def get_capability(session: Session, capability_id: str, *, require_active: bool = False) -> dict:
    repo = CapabilityRepository(session)
    model = repo.get(capability_id)
    if model is None:
        raise NotFoundError("Capability not found")
    if require_active and model.publication_status != "active":
        raise NotFoundError("Capability not found")
    return _to_dict(model)


def list_capabilities(session: Session) -> list[dict]:
    repo = CapabilityRepository(session)
    return [_to_dict(m) for m in repo.list_all()]


def _to_dict(model: CapabilityModel) -> dict:
    return {
        "id": model.id,
        "name": model.name,
        "secret_id": model.secret_id,
        "allowed_mode": model.allowed_mode,
        "lease_ttl_seconds": model.lease_ttl_seconds,
        "risk_level": model.risk_level,
        "approval_mode": model.approval_mode,
        "approval_rules": model.approval_rules or [],
        "allowed_audience": model.allowed_audience or [],
        "access_policy": serialize_capability_access_policy(model.access_policy),
        "required_provider": model.required_provider,
        "required_provider_scopes": model.required_provider_scopes or [],
        "allowed_environments": model.allowed_environments or [],
        "adapter_type": model.adapter_type or "generic_http",
        "adapter_config": model.adapter_config or {},
        "publication_status": model.publication_status,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "reviewed_at": model.reviewed_at,
    }

from __future__ import annotations

from sqlalchemy.orm import Session

from app.orm.capability import CapabilityModel
from app.repositories.capability_repo import CapabilityRepository
from app.schemas.capabilities import CapabilityCreate
from app.services.scope_policy import ensure_binding_compatible


def create_capability(session: Session, payload: CapabilityCreate, secret) -> dict:
    repo = CapabilityRepository(session)
    ensure_binding_compatible(secret, payload)
    cap_id = f"capability-{len(repo.list_all()) + 1}"
    model = CapabilityModel(
        id=cap_id,
        name=payload.name,
        secret_id=payload.secret_id,
        allowed_mode=payload.allowed_mode,
        lease_ttl_seconds=payload.lease_ttl_seconds,
        risk_level=payload.risk_level,
        approval_mode=payload.approval_mode,
        allowed_audience=payload.allowed_audience,
        required_provider=payload.required_provider,
        required_provider_scopes=payload.required_provider_scopes,
        allowed_environments=payload.allowed_environments,
        adapter_type=payload.adapter_type,
        adapter_config=payload.adapter_config,
    )
    repo.create(model)
    return _to_dict(model)


def get_capability(session: Session, capability_id: str) -> dict:
    repo = CapabilityRepository(session)
    model = repo.get(capability_id)
    if model is None:
        raise KeyError(f"Capability {capability_id} not found")
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
        "allowed_audience": model.allowed_audience or [],
        "required_provider": model.required_provider,
        "required_provider_scopes": model.required_provider_scopes or [],
        "allowed_environments": model.allowed_environments or [],
        "adapter_type": model.adapter_type or "generic_http",
        "adapter_config": model.adapter_config or {},
    }

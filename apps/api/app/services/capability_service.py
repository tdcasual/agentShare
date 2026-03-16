from __future__ import annotations

from app.models.capability import CapabilityRecord
from app.schemas.capabilities import CapabilityCreate
from app.store import next_id, store


def create_capability(payload: CapabilityCreate) -> dict:
    capability = CapabilityRecord(
        id=next_id("capability"),
        name=payload.name,
        secret_id=payload.secret_id,
        risk_level=payload.risk_level,
        allowed_mode=payload.allowed_mode,
        lease_ttl_seconds=payload.lease_ttl_seconds,
        approval_mode=payload.approval_mode,
        allowed_audience=payload.allowed_audience,
    )
    record = capability.model_dump()
    store.capabilities[capability.id] = record
    return record


def list_capabilities() -> list[dict]:
    return list(store.capabilities.values())


def get_capability(capability_id: str) -> dict:
    return store.capabilities[capability_id]

from fastapi import APIRouter, HTTPException, status

from app.schemas.capabilities import CapabilityCreate, CapabilityResponse
from app.services.audit_service import write_audit_event
from app.services.capability_service import create_capability, list_capabilities
from app.store import store


router = APIRouter(prefix="/api/capabilities", tags=["capabilities"])


@router.post("", response_model=CapabilityResponse, status_code=status.HTTP_201_CREATED)
def create_capability_route(payload: CapabilityCreate) -> dict:
    if payload.secret_id not in store.secrets:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")

    record = create_capability(payload)
    write_audit_event("capability_created", {"capability_id": record["id"], "secret_id": payload.secret_id})
    return record


@router.get("")
def list_capabilities_route() -> dict:
    return {"items": list_capabilities()}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.repositories.secret_repo import SecretRepository
from app.schemas.capabilities import CapabilityCreate, CapabilityResponse
from app.services.audit_service import write_audit_event
from app.services.capability_service import create_capability, list_capabilities

router = APIRouter(prefix="/api/capabilities", tags=["capabilities"])


@router.post("", response_model=CapabilityResponse, status_code=status.HTTP_201_CREATED)
def create_capability_route(payload: CapabilityCreate, session: Session = Depends(get_db)) -> dict:
    secret_repo = SecretRepository(session)
    if secret_repo.get(payload.secret_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Secret not found")

    record = create_capability(session, payload)
    write_audit_event(session, "capability_created", {"capability_id": record["id"], "secret_id": payload.secret_id})
    return record


@router.get("")
def list_capabilities_route(session: Session = Depends(get_db)) -> dict:
    return {"items": list_capabilities(session)}

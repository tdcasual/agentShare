from fastapi import APIRouter, status

from app.schemas.secrets import SecretCreate, SecretResponse
from app.services.audit_service import write_audit_event
from app.services.secret_backend import get_secret_backend
from app.store import store


router = APIRouter(prefix="/api/secrets", tags=["secrets"])


@router.post("", response_model=SecretResponse, status_code=status.HTTP_201_CREATED)
def create_secret(payload: SecretCreate) -> dict:
    backend = get_secret_backend()
    secret_id, backend_ref = backend.write_secret(payload.value)
    record = {
        "id": secret_id,
        "display_name": payload.display_name,
        "kind": payload.kind,
        "scope": payload.scope,
        "backend_ref": backend_ref,
    }
    store.secrets[secret_id] = record
    write_audit_event("secret_created", {"secret_id": secret_id, "backend_ref": backend_ref})
    return record


@router.get("")
def list_secrets() -> dict:
    return {"items": list(store.secrets.values())}

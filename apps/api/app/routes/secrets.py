from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.orm.secret import SecretModel
from app.repositories.secret_repo import SecretRepository
from app.schemas.secrets import SecretCreate, SecretResponse
from app.services.audit_service import write_audit_event
from app.services.secret_backend import get_secret_backend

router = APIRouter(prefix="/api/secrets", tags=["secrets"])


@router.post("", response_model=SecretResponse, status_code=status.HTTP_201_CREATED)
def create_secret(payload: SecretCreate, session: Session = Depends(get_db)) -> dict:
    backend = get_secret_backend()
    secret_id, backend_ref = backend.write_secret(payload.value)
    model = SecretModel(
        id=secret_id,
        display_name=payload.display_name,
        kind=payload.kind,
        scope=payload.scope,
        backend_ref=backend_ref,
    )
    repo = SecretRepository(session)
    repo.create(model)
    write_audit_event(session, "secret_created", {"secret_id": secret_id, "backend_ref": backend_ref})
    return {
        "id": model.id,
        "display_name": model.display_name,
        "kind": model.kind,
        "scope": model.scope,
        "backend_ref": model.backend_ref,
    }


@router.get("")
def list_secrets(session: Session = Depends(get_db)) -> dict:
    repo = SecretRepository(session)
    items = [
        {
            "id": m.id,
            "display_name": m.display_name,
            "kind": m.kind,
            "scope": m.scope,
            "backend_ref": m.backend_ref,
        }
        for m in repo.list_all()
    ]
    return {"items": items}

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth import require_bootstrap_agent
from app.db import get_db
from app.orm.secret import SecretModel
from app.repositories.secret_repo import SecretRepository
from app.schemas.secrets import SecretCreate, SecretResponse
from app.services.audit_service import write_audit_event
from app.services.secret_backend import get_secret_backend

router = APIRouter(prefix="/api/secrets")


@router.post(
    "",
    response_model=SecretResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create a stored secret",
    description="Store a plaintext credential in the secret backend and keep only normalized metadata in the control plane.",
)
def create_secret(
    payload: SecretCreate,
    agent=Depends(require_bootstrap_agent),
    session: Session = Depends(get_db),
) -> dict:
    backend = get_secret_backend()
    secret_id, backend_ref = backend.write_secret(payload.value)
    model = SecretModel(
        id=secret_id,
        display_name=payload.display_name,
        kind=payload.kind,
        scope=payload.metadata,
        provider=payload.provider,
        environment=payload.environment,
        provider_scopes=payload.provider_scopes,
        resource_selector=payload.resource_selector,
        metadata_json=payload.metadata,
        backend_ref=backend_ref,
    )
    repo = SecretRepository(session)
    repo.create(model)
    write_audit_event(session, "secret_created", {
        "secret_id": secret_id,
        "backend_ref": backend_ref,
        "created_by": agent.id,
    })
    return _to_secret_response(model)


@router.get(
    "",
    tags=["Management"],
    summary="List stored secret references",
    description="Return redacted secret inventory for the management console. Plaintext values are never returned.",
)
def list_secrets(
    agent=Depends(require_bootstrap_agent),
    session: Session = Depends(get_db),
) -> dict:
    repo = SecretRepository(session)
    items = [_to_secret_response(model) for model in repo.list_all()]
    write_audit_event(session, "secrets_listed", {"agent_id": agent.id, "count": len(items)})
    return {"items": items}


def _to_secret_response(model: SecretModel) -> dict:
    return {
        "id": model.id,
        "display_name": model.display_name,
        "kind": model.kind,
        "scope": {
            "provider": model.provider,
            "environment": model.environment,
            "provider_scopes": model.provider_scopes or [],
            "resource_selector": model.resource_selector,
        },
        "provider": model.provider,
        "environment": model.environment,
        "provider_scopes": model.provider_scopes or [],
        "resource_selector": model.resource_selector,
        "metadata": model.metadata_json or model.scope or {},
        "backend_ref": model.backend_ref,
    }

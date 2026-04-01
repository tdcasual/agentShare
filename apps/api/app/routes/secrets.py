from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.auth import AuthenticatedActor, ManagementIdentity, require_admin_management_session, require_admin_management_or_agent
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.orm.secret import SecretModel
from app.repositories.secret_repo import SecretRepository
from app.schemas.secrets import SecretCreate, SecretResponse
from app.services.audit_service import actor_payload, write_audit_event
from app.services.secret_backend import get_secret_backend
from app.services.review_service import publication_status_for_actor

router = APIRouter(prefix="/api/secrets")


@router.post(
    "",
    response_model=SecretResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management"],
    summary="Create a stored secret",
    description="Store a plaintext credential in the secret backend and keep only normalized metadata in the control plane. Requires an admin-or-higher management role.",
)
def create_secret(
    payload: SecretCreate,
    response: Response,
    actor: AuthenticatedActor = Depends(require_admin_management_or_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    backend = get_secret_backend(settings)
    secret_id, backend_ref = backend.write_secret(payload.value)
    publication_status = publication_status_for_actor(actor.actor_type)
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
        created_by=actor.actor_type,
        created_by_actor_type=actor.actor_type,
        created_by_actor_id=actor.id,
        created_via_token_id=actor.token_id,
        publication_status=publication_status,
    )
    repo = SecretRepository(session)
    repo.create(model)
    if actor.actor_type == "agent":
        response.status_code = status.HTTP_202_ACCEPTED
    write_audit_event(session, "secret_created", {
        "secret_id": secret_id,
        "backend_ref": backend_ref,
        **actor_payload(actor),
    })
    return _to_secret_response(model)


@router.get(
    "",
    tags=["Management"],
    summary="List stored secret references",
    description="Return redacted secret inventory for the management console. Plaintext values are never returned. Requires an admin-or-higher management role.",
)
def list_secrets(
    manager: ManagementIdentity = Depends(require_admin_management_session),
    session: Session = Depends(get_db),
) -> dict:
    repo = SecretRepository(session)
    items = [_to_secret_response(model) for model in repo.list_all()]
    write_audit_event(session, "secrets_listed", {
        "actor_type": manager.actor_type,
        "actor_id": manager.id,
        "count": len(items),
    })
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
        "publication_status": model.publication_status,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "reviewed_at": model.reviewed_at,
    }

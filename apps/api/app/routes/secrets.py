import logging

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
from app.services.pending_secret_service import (
    build_pending_secret_ref,
    new_pending_secret_id,
    stage_secret_material,
)
from app.services.secret_backend import get_secret_backend
from app.services.secret_scope_service import build_secret_scope
from app.services.review_service import publication_status_for_actor

router = APIRouter(prefix="/api/secrets")
logger = logging.getLogger(__name__)


@router.post(
    "",
    response_model=SecretResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Management", "Agent Runtime"],
    summary="Create or submit a stored secret",
    description=(
        "Admin management sessions may create an active stored secret immediately. "
        "Authenticated runtime agents may submit a pending-review secret; plaintext secret material stays staged "
        "until a human approves the review decision."
    ),
)
def create_secret(
    payload: SecretCreate,
    response: Response,
    actor: AuthenticatedActor = Depends(require_admin_management_or_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    backend = None
    secret_id: str | None = None
    backend_ref: str | None = None
    external_secret_written = False
    publication_status = publication_status_for_actor(actor.actor_type)
    is_runtime_actor = actor.actor_type != "human"
    try:
        if is_runtime_actor:
            secret_id = new_pending_secret_id()
            backend_ref = build_pending_secret_ref(secret_id)
            stage_secret_material(session, secret_id=secret_id, secret_value=payload.value)
        else:
            backend = get_secret_backend(settings)
            secret_id, backend_ref = backend.write_secret(payload.value)
            external_secret_written = True
        model = SecretModel(
            id=secret_id,
            display_name=payload.display_name,
            kind=payload.kind,
            scope=build_secret_scope(
                provider=payload.provider,
                environment=payload.environment,
                provider_scopes=payload.provider_scopes,
                resource_selector=payload.resource_selector,
            ),
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
        if is_runtime_actor:
            response.status_code = status.HTTP_202_ACCEPTED
        write_audit_event(session, "secret_created", {
            "secret_id": secret_id,
            "backend_ref": backend_ref,
            **actor_payload(actor),
        })
        if external_secret_written:
            session.commit()
        return _to_secret_response(model)
    except Exception:
        session.rollback()
        if external_secret_written and backend is not None and secret_id is not None and backend_ref is not None:
            try:
                backend.delete_secret(secret_id, backend_ref)
            except Exception:
                logger.exception(
                    "Failed to clean up secret backend entry after create_secret failure",
                    extra={"secret_id": secret_id},
                )
        raise


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
        "scope": build_secret_scope(
            provider=model.provider,
            environment=model.environment,
            provider_scopes=model.provider_scopes,
            resource_selector=model.resource_selector,
        ),
        "provider": model.provider,
        "environment": model.environment,
        "provider_scopes": model.provider_scopes or [],
        "resource_selector": model.resource_selector,
        "metadata": model.metadata_json if model.metadata_json is not None else (model.scope or {}),
        "backend_ref": model.backend_ref,
        "publication_status": model.publication_status,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "reviewed_at": model.reviewed_at,
        "review_reason": model.review_reason,
    }

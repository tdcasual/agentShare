from __future__ import annotations

from app.orm.secret import SecretModel
from app.services.secret_scope_service import build_secret_scope


def secret_to_dict(model: SecretModel) -> dict:
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
        "metadata": model.metadata_json or {},
        "backend_ref": model.backend_ref,
        "publication_status": model.publication_status,
        "created_by_actor_type": model.created_by_actor_type,
        "created_by_actor_id": model.created_by_actor_id,
        "created_via_token_id": model.created_via_token_id,
        "reviewed_at": model.reviewed_at,
        "review_reason": model.review_reason,
    }

from __future__ import annotations

from app.orm import Secret


def serialize_secret(secret: Secret) -> dict:
    return {
        "id": secret.id,
        "name": secret.name,
        "type": secret.type,
        "url": secret.url,
        "documentation_url": secret.documentation_url,
        "username": secret.username,
        "description": secret.description,
        "tags": secret.tags,
        "metadata": secret.secret_metadata,
        "space_id": secret.space_id,
        "created_by_agent_id": secret.created_by_agent_id,
        "version": secret.version,
        "created_at": secret.created_at.isoformat(),
        "updated_at": secret.updated_at.isoformat(),
    }

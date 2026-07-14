from __future__ import annotations

from app.orm import Secret


def serialize_secret(secret: Secret) -> dict:
    return {
        "id": secret.id,
        "name": secret.name,
        "type": secret.type,
        "url": secret.url,
        "username": secret.username,
        "description": secret.description,
        "tags": secret.tags,
        "metadata": secret.secret_metadata,
        "created_at": secret.created_at.isoformat(),
        "updated_at": secret.updated_at.isoformat(),
    }

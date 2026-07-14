from __future__ import annotations

from app.orm import AgentToken


def serialize_token(token: AgentToken) -> dict:
    return {
        "id": token.id,
        "agent_id": token.agent_id,
        "name": token.name,
        "description": token.description,
        "key_prefix": token.key_prefix,
        "status": token.status,
        "expires_at": token.expires_at.isoformat() if token.expires_at else None,
        "last_used_at": token.last_used_at.isoformat() if token.last_used_at else None,
        "created_at": token.created_at.isoformat(),
    }

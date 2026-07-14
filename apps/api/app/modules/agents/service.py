from __future__ import annotations

from app.orm import Agent


def serialize_agent(agent: Agent) -> dict:
    return {
        "id": agent.id,
        "name": agent.name,
        "description": agent.description,
        "status": agent.status,
        "created_at": agent.created_at.isoformat(),
        "updated_at": agent.updated_at.isoformat(),
    }

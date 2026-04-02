from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CatalogItem(BaseModel):
    release_id: str
    resource_kind: str
    resource_id: str
    title: str
    subtitle: str | None = None
    version: int
    release_status: str
    released_at: datetime
    created_by_actor_id: str
    created_via_token_id: str | None = None
    adoption_count: int = 0


class CatalogResponse(BaseModel):
    items: list[CatalogItem] = Field(default_factory=list)

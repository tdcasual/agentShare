from __future__ import annotations

from pydantic import BaseModel, Field


class SearchResultItem(BaseModel):
    id: str
    kind: str
    title: str
    subtitle: str
    href: str


class SearchResponse(BaseModel):
    identities: list[SearchResultItem] = Field(default_factory=list)
    tasks: list[SearchResultItem] = Field(default_factory=list)
    assets: list[SearchResultItem] = Field(default_factory=list)
    skills: list[SearchResultItem] = Field(default_factory=list)
    events: list[SearchResultItem] = Field(default_factory=list)

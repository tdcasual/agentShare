from __future__ import annotations

from pydantic import BaseModel, Field


class SecretCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=50)
    value: str = Field(max_length=1_000_000)
    url: str | None = None
    username: str | None = Field(default=None, max_length=255)
    description: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=100)
    metadata: dict = Field(default_factory=dict)


class SecretUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: str | None = Field(default=None, min_length=1, max_length=50)
    value: str | None = Field(default=None, max_length=1_000_000)
    url: str | None = None
    username: str | None = Field(default=None, max_length=255)
    description: str | None = None
    tags: list[str] | None = Field(default=None, max_length=100)
    metadata: dict | None = None

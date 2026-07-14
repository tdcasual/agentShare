from __future__ import annotations

from typing import Self

from pydantic import BaseModel, Field, model_validator

from app.orm.secret import SecretType


class SecretCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: SecretType
    value: str = Field(max_length=1_000_000)
    url: str | None = None
    username: str | None = Field(default=None, max_length=255)
    description: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=100)
    metadata: dict = Field(default_factory=dict)


class SecretUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: SecretType | None = None
    value: str | None = Field(default=None, max_length=1_000_000)
    url: str | None = None
    username: str | None = Field(default=None, max_length=255)
    description: str | None = None
    tags: list[str] | None = Field(default=None, max_length=100)
    metadata: dict | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_fields = {"name", "type", "value", "tags", "metadata"}
        null_fields = required_fields.intersection(self.model_fields_set)
        if any(getattr(self, field) is None for field in null_fields):
            raise ValueError("name, type, value, tags, and metadata cannot be null")
        return self

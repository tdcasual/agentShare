from __future__ import annotations

import json
from typing import Annotated, Any, Self
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator

from app.orm.secret import SecretType

SecretTag = Annotated[str, Field(min_length=1, max_length=64)]
MAX_METADATA_BYTES = 65_536
MAX_METADATA_DEPTH = 8


def _metadata_depth(value: Any, depth: int = 0) -> int:
    if depth > MAX_METADATA_DEPTH:
        return depth
    if isinstance(value, dict):
        return max((_metadata_depth(item, depth + 1) for item in value.values()), default=depth)
    if isinstance(value, list):
        return max((_metadata_depth(item, depth + 1) for item in value), default=depth)
    return depth


def _validate_metadata(value: dict[str, Any]) -> dict[str, Any]:
    if _metadata_depth(value) > MAX_METADATA_DEPTH:
        raise ValueError(f"metadata must not exceed {MAX_METADATA_DEPTH} levels")
    serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(serialized.encode("utf-8")) > MAX_METADATA_BYTES:
        raise ValueError(f"metadata must not exceed {MAX_METADATA_BYTES} UTF-8 bytes")
    return value


def _validate_documentation_url(value: str | None) -> str | None:
    if value is None:
        return None
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("documentation_url must be an http(s) URL")
    return value


class SecretCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: SecretType
    value: str = Field(min_length=1, max_length=1_000_000)
    url: str | None = Field(default=None, max_length=2048)
    documentation_url: str | None = Field(default=None, max_length=2048)
    username: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    tags: list[SecretTag] = Field(default_factory=list, max_length=100)
    metadata: dict[str, Any] = Field(default_factory=dict)
    space_id: str | None = Field(default=None, max_length=255)

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, value: list[str]) -> list[str]:
        normalized = [tag.strip() for tag in value]
        if any(not tag for tag in normalized):
            raise ValueError("tags must not be blank")
        return normalized

    @field_validator("metadata")
    @classmethod
    def validate_metadata(cls, value: dict[str, Any]) -> dict[str, Any]:
        return _validate_metadata(value)

    @field_validator("documentation_url")
    @classmethod
    def validate_documentation_url(cls, value: str | None) -> str | None:
        return _validate_documentation_url(value)


class SecretUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: SecretType | None = None
    value: str | None = Field(default=None, min_length=1, max_length=1_000_000)
    url: str | None = Field(default=None, max_length=2048)
    documentation_url: str | None = Field(default=None, max_length=2048)
    username: str | None = Field(default=None, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    tags: list[SecretTag] | None = Field(default=None, max_length=100)
    metadata: dict[str, Any] | None = None
    space_id: str | None = Field(default=None, max_length=255)

    @field_validator("tags")
    @classmethod
    def normalize_optional_tags(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        return SecretCreate.normalize_tags(value)

    @field_validator("metadata")
    @classmethod
    def validate_optional_metadata(cls, value: dict[str, Any] | None) -> dict[str, Any] | None:
        return _validate_metadata(value) if value is not None else value

    @field_validator("documentation_url")
    @classmethod
    def validate_documentation_url(cls, value: str | None) -> str | None:
        return _validate_documentation_url(value)

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_fields = {"name", "type", "value", "tags", "metadata"}
        null_fields = required_fields.intersection(self.model_fields_set)
        if any(getattr(self, field) is None for field in null_fields):
            raise ValueError("name, type, value, tags, and metadata cannot be null")
        return self


class AgentSecretCreate(SecretCreate):
    """Agent contribution payload; the target Space comes from the URL."""

    @model_validator(mode="after")
    def reject_body_space(self) -> Self:
        if "space_id" in self.model_fields_set:
            raise ValueError("space_id must be provided in the URL")
        return self


class AgentSecretUpdate(SecretUpdate):
    @model_validator(mode="after")
    def require_change(self) -> Self:
        if not self.model_fields_set:
            raise ValueError("at least one field must be provided")
        if "space_id" in self.model_fields_set:
            raise ValueError("Agents cannot move Secrets between Spaces")
        return self

"""VaultGate schemas for API requests and responses."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""

    limit: int = Field(default=50, ge=1, le=100, description="Maximum items to return")
    offset: int = Field(default=0, ge=0, description="Number of items to skip")


class VaultSecretBase(BaseModel):
    """Base secret schema."""

    name: str = Field(..., min_length=1, max_length=255, description="Secret display name")
    type: str = Field(..., description="Secret type")
    url: str | None = Field(None, description="Associated URL")
    username: str | None = Field(None, max_length=255, description="Username (for password/basic_auth types)")
    description: str | None = Field(None, description="Usage instructions or documentation for this secret")
    tags: list[str] = Field(default_factory=list, description="Tags for grouping")
    metadata: dict = Field(default_factory=dict, description="Additional metadata")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Validate secret type."""
        valid_types = {
            "password", "api_key", "basic_auth", "bearer_token",
            "api_key_header", "oauth_token", "certificate", "ssh_key",
            "database_url", "custom"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid type. Must be one of: {', '.join(sorted(valid_types))}")
        return v


class VaultSecretCreate(VaultSecretBase):
    """Schema for creating a new secret."""

    value: str = Field(..., min_length=1, max_length=65536, description="Secret value (will be encrypted)")


class VaultSecretUpdate(BaseModel):
    """Schema for updating a secret."""

    name: str | None = Field(None, min_length=1, max_length=255)
    type: str | None = None
    url: str | None = None
    username: str | None = Field(None, max_length=255)
    description: str | None = None
    value: str | None = Field(None, min_length=1, max_length=65536)
    tags: list[str] | None = None
    metadata: dict | None = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str | None) -> str | None:
        """Validate secret type if provided."""
        if v is None:
            return v
        valid_types = {
            "password", "api_key", "basic_auth", "bearer_token",
            "api_key_header", "oauth_token", "certificate", "ssh_key",
            "database_url", "custom"
        }
        if v not in valid_types:
            raise ValueError(f"Invalid type. Must be one of: {', '.join(sorted(valid_types))}")
        return v


class VaultSecretResponse(BaseModel):
    """Schema for secret response."""

    id: str
    name: str
    type: str
    url: str | None
    username: str | None
    description: str | None
    tags: list[str]
    metadata: dict
    created_at: str
    updated_at: str


class VaultSecretListItem(BaseModel):
    """Schema for secret list item (no value)."""

    id: str
    name: str
    type: str
    url: str | None
    description: str | None
    tags: list[str]
    created_at: str


class VaultSecretListResponse(BaseModel):
    """Schema for secret list response."""

    items: list[VaultSecretListItem]


class VaultTokenCreate(BaseModel):
    """Schema for creating a new token."""

    name: str = Field(..., min_length=1, max_length=255, description="Token display name")
    description: str | None = Field(None, description="Token description")
    expires_at: datetime | None = Field(None, description="Token expiration time")


class VaultTokenResponse(BaseModel):
    """Schema for token response."""

    id: str
    name: str
    description: str | None
    status: str
    key_prefix: str
    expires_at: str | None
    last_used_at: str | None
    created_at: str
    scopes_count: int


class VaultTokenDetailResponse(VaultTokenResponse):
    """Schema for token detail with scopes."""

    scopes: list[dict]


class VaultScopeCreate(BaseModel):
    """Schema for creating a scope."""

    secret_id: str = Field(..., description="Secret ID to grant access to")

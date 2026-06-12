"""VaultGate schemas for API requests and responses."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
from typing import Generic, Optional, TypeVar
from datetime import datetime

T = TypeVar("T")


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""

    limit: int = Field(default=50, ge=1, le=100, description="Maximum items to return")
    offset: int = Field(default=0, ge=0, description="Number of items to skip")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""

    items: list[T]
    total: int
    limit: int
    offset: int


class VaultSecretBase(BaseModel):
    """Base secret schema."""

    name: str = Field(..., min_length=1, max_length=255, description="Secret display name")
    type: str = Field(..., description="Secret type")
    url: Optional[str] = Field(None, description="Associated URL")
    username: Optional[str] = Field(None, max_length=255, description="Username (for password/basic_auth types)")
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

    value: str = Field(..., min_length=1, description="Secret value (will be encrypted)")


class VaultSecretUpdate(BaseModel):
    """Schema for updating a secret."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[str] = None
    url: Optional[str] = None
    username: Optional[str] = Field(None, max_length=255)
    value: Optional[str] = Field(None, min_length=1)
    tags: Optional[list[str]] = None
    metadata: Optional[dict] = None

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
    url: Optional[str]
    username: Optional[str]
    tags: list[str]
    metadata: dict
    created_at: str
    updated_at: str


class VaultSecretListItem(BaseModel):
    """Schema for secret list item (no value)."""

    id: str
    name: str
    type: str
    url: Optional[str]
    tags: list[str]
    created_at: str


class VaultSecretListResponse(BaseModel):
    """Schema for secret list response."""

    items: list[VaultSecretListItem]


class VaultTokenCreate(BaseModel):
    """Schema for creating a new token."""

    name: str = Field(..., min_length=1, max_length=255, description="Token display name")
    description: Optional[str] = Field(None, description="Token description")
    expires_at: Optional[datetime] = Field(None, description="Token expiration time")


class VaultTokenResponse(BaseModel):
    """Schema for token response."""

    id: str
    name: str
    description: Optional[str]
    status: str
    key_prefix: str
    expires_at: Optional[str]
    last_used_at: Optional[str]
    created_at: str
    scopes_count: int


class VaultTokenDetailResponse(VaultTokenResponse):
    """Schema for token detail with scopes."""

    scopes: list[dict]


class VaultScopeCreate(BaseModel):
    """Schema for creating a scope."""

    secret_id: str = Field(..., description="Secret ID to grant/deny access to")
    allowed: bool = Field(default=True, description="Whether to allow or deny access")


class VaultScopeBatchCreate(BaseModel):
    """Schema for batch creating scopes."""

    grants: list[VaultScopeCreate]


class VaultBatchSecretRequest(BaseModel):
    """Schema for a single item in a batch secret fetch request."""

    secret_id: str = Field(..., min_length=1, description="Secret ID to fetch")
    fields: list[str] = Field(
        default_factory=lambda: ["name", "type"],
        description="Fields to return (e.g., name, type, url, username, value, tags, metadata)",
    )


class VaultBatchSecretBatchRequest(BaseModel):
    """Schema for batch secret fetch request body."""

    requests: list[VaultBatchSecretRequest] = Field(..., min_length=1, max_length=50, description="List of secret fetch requests")



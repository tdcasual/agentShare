from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel

from app.orm.secret import SecretType


class BootstrapStatusResponse(BaseModel):
    setup_required: bool
    bootstrap_token_required: bool


class AdminUserResponse(BaseModel):
    id: str
    email: str


class LoginResponse(BaseModel):
    email: str
    status: str


class AdminSessionResponse(BaseModel):
    id: str
    email: str
    auth_type: Literal["session", "management_token"]


class ManagementTokenSummary(BaseModel):
    id: str
    name: str
    description: str | None
    key_prefix: str
    expires_at: str | None
    revoked_at: str | None
    last_used_at: str | None
    created_at: str


class ManagementTokenIssued(BaseModel):
    id: str
    name: str
    token: str
    key_prefix: str
    expires_at: str | None
    revoked_at: str | None = None


class RevokeAllTokensResponse(BaseModel):
    management_tokens_revoked: int
    agent_tokens_revoked: int


class SecretResponse(BaseModel):
    id: str
    name: str
    type: SecretType
    url: str | None
    documentation_url: str | None
    username: str | None
    description: str | None
    tags: list[str]
    metadata: dict[str, Any]
    space_id: str | None
    created_by_agent_id: str | None
    version: int
    created_at: str
    updated_at: str


class SecretValueResponse(BaseModel):
    value: str


class ReencryptResponse(BaseModel):
    updated: int


class AgentResponse(BaseModel):
    id: str
    name: str
    description: str | None
    status: Literal["active", "disabled"]
    created_at: str
    updated_at: str


class AgentTokenResponse(BaseModel):
    id: str
    agent_id: str
    name: str
    description: str | None
    key_prefix: str
    status: Literal["active", "revoked"]
    expires_at: str | None
    last_used_at: str | None
    created_at: str


class IssuedAgentTokenResponse(AgentTokenResponse):
    token: str


class AgentTokenOptionResponse(AgentTokenResponse):
    agent_name: str


class GrantResponse(BaseModel):
    secret_ids: list[str]


class AuditLogResponse(BaseModel):
    id: str
    actor_type: str
    actor_id: str | None
    actor_label: str
    resource_type: str | None
    resource_id: str | None
    resource_label: str | None
    action: str
    result: Literal["success", "denied"]
    reason: str | None
    request_id: str | None
    created_at: str


class AuditActionsResponse(BaseModel):
    items: list[str]


class AuditStatsResponse(BaseModel):
    total: int
    granted: int
    denied: int
    value_reads: int


class VaultIdentityResponse(BaseModel):
    agent_id: str
    agent_name: str
    token_id: str
    token_name: str


class VaultSpaceResponse(BaseModel):
    id: str
    name: str
    description: str | None
    status: Literal["active", "archived"]
    created_at: str
    updated_at: str


class VaultAccessibleSpaceResponse(VaultSpaceResponse):
    role: Literal["reader", "contributor", "maintainer"]


class SpaceMembershipResponse(BaseModel):
    token_id: str
    role: Literal["reader", "contributor", "maintainer"]
    status: Literal["active", "revoked"]


class SpaceMembershipListResponse(BaseModel):
    members: list[SpaceMembershipResponse]


class VaultSecretResponse(SecretResponse):
    permissions: list[Literal["read", "create", "update"]]
    access_source: Literal["direct", "space", "both"]


class SecretListResponse(BaseModel):
    items: list[SecretResponse]


class VaultSecretPageResponse(BaseModel):
    items: list[VaultSecretResponse]
    total: int
    limit: int
    offset: int


class VaultSpaceListResponse(BaseModel):
    items: list[VaultAccessibleSpaceResponse]


class VaultSpacePageResponse(BaseModel):
    items: list[VaultSpaceResponse]


class SecretPageResponse(SecretListResponse):
    total: int
    limit: int
    offset: int


class AgentPageResponse(BaseModel):
    items: list[AgentResponse]
    total: int
    limit: int
    offset: int


class AgentTokenPageResponse(BaseModel):
    items: list[AgentTokenResponse]
    total: int
    limit: int
    offset: int


class AgentTokenOptionPageResponse(BaseModel):
    items: list[AgentTokenOptionResponse]
    total: int
    limit: int
    offset: int


class ManagementTokenPageResponse(BaseModel):
    items: list[ManagementTokenSummary]
    total: int
    limit: int
    offset: int


class AuditLogPageResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    limit: int
    offset: int

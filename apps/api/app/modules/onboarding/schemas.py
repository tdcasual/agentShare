from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AgentJoinRequestCreate(BaseModel):
    invite_code: str = Field(min_length=16, max_length=255)
    agent_name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class AgentJoinRequestResponse(BaseModel):
    request_id: str
    request_secret: str
    status: Literal["pending"]
    expires_at: str


class AgentJoinStatusResponse(BaseModel):
    status: Literal["pending", "approved", "rejected", "expired"]
    agent_id: str | None = None
    reason: str | None = None


class AgentCredentialResponse(BaseModel):
    status: Literal["approved"]
    agent_id: str
    token: str


class AdminInviteCreate(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    space_id: str | None = Field(default=None, max_length=255)
    role: Literal["reader", "contributor", "maintainer"] = "reader"
    ttl_seconds: int = Field(default=86400, ge=300, le=604800)


class AdminInviteResponse(BaseModel):
    id: str
    label: str
    code: str
    default_space_id: str | None
    default_role: Literal["reader", "contributor", "maintainer"]
    status: Literal["active", "consumed", "revoked", "expired"]
    expires_at: str
    created_at: str


class AdminInviteSummary(BaseModel):
    id: str
    label: str
    default_space_id: str | None
    default_role: Literal["reader", "contributor", "maintainer"]
    status: Literal["active", "consumed", "revoked", "expired"]
    expires_at: str
    created_at: str


class AdminJoinRequestSummary(BaseModel):
    id: str
    invite_id: str
    proposed_name: str
    description: str | None
    status: Literal["pending", "approved", "rejected", "expired"]
    agent_id: str | None
    rejection_reason: str | None
    created_at: str
    reviewed_at: str | None


class AdminJoinRequestApprove(BaseModel):
    token_name: str = Field(default="initial", min_length=1, max_length=255)
    space_id: str | None = Field(default=None, max_length=255)
    role: Literal["reader", "contributor", "maintainer"] | None = None


class AdminJoinRequestReject(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)

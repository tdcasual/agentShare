from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.access_policy import CapabilityAccessPolicy
from app.schemas.policy import ApprovalRule


class CapabilityCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "github.repo.sync",
            "secret_id": "secret-1",
            "risk_level": "medium",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "approval_mode": "auto",
            "approval_rules": [
                {
                    "decision": "manual",
                    "reason": "High-risk production invokes require review",
                    "action_types": ["invoke"],
                    "risk_levels": ["high"],
                    "providers": ["openai"],
                    "environments": ["production"],
                }
            ],
            "allowed_audience": ["agent"],
            "access_policy": {
                "mode": "all_tokens",
                "selectors": [],
            },
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
            "allowed_environments": ["production"],
            "adapter_type": "generic_http",
            "adapter_config": {},
            "publication_status": "active",
        },
    })

    name: str = Field(description="Stable capability name that agents reference at runtime.")
    secret_id: str = Field(description="Stored secret backing this capability.")
    risk_level: str = Field(description="Risk tier used for review and policy decisions.")
    allowed_mode: str = Field(
        default="proxy_only",
        description="proxy_only keeps the secret behind the gateway; proxy_or_lease allows short-lived leases.",
    )
    lease_ttl_seconds: int = Field(
        default=60,
        description="Maximum lease duration in seconds when allowed_mode permits leases.",
    )
    approval_mode: Literal["auto", "manual"] = Field(
        default="auto",
        description="Approval workflow mode for this capability.",
    )
    approval_rules: list[ApprovalRule] = Field(
        default_factory=list,
        description="Optional policy rules evaluated before falling back to approval_mode.",
    )
    allowed_audience: list[str] = Field(
        default_factory=list,
        description="Optional audience labels that may use this capability.",
    )
    access_policy: CapabilityAccessPolicy = Field(
        default_factory=CapabilityAccessPolicy,
        description="Selector-based runtime access policy for this capability. Defaults to all active tokens.",
    )
    required_provider: str | None = Field(
        default=None,
        description="Required secret provider, such as openai or github.",
    )
    required_provider_scopes: list[str] = Field(
        default_factory=list,
        description="Provider scopes that must be present on the bound secret.",
    )
    allowed_environments: list[str] = Field(
        default_factory=list,
        description="Allowed secret environments for this capability, such as production or staging.",
    )
    adapter_type: str = Field(default="generic_http", description="Gateway adapter used for proxy execution.")
    adapter_config: dict[str, Any] = Field(
        default_factory=dict,
        description="Adapter-specific proxy configuration.",
    )


class CapabilityResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "id": "capability-1",
            "name": "github.repo.sync",
            "secret_id": "secret-1",
            "risk_level": "medium",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "approval_mode": "auto",
            "approval_rules": [
                {
                    "decision": "manual",
                    "reason": "High-risk production invokes require review",
                    "action_types": ["invoke"],
                    "risk_levels": ["high"],
                    "providers": ["openai"],
                    "environments": ["production"],
                }
            ],
            "allowed_audience": ["agent"],
            "access_policy": {
                "mode": "all_tokens",
                "selectors": [],
            },
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
            "allowed_environments": ["production"],
            "adapter_type": "generic_http",
            "adapter_config": {},
        },
    })

    id: str
    name: str
    secret_id: str
    risk_level: str
    allowed_mode: str
    lease_ttl_seconds: int
    approval_mode: Literal["auto", "manual"]
    approval_rules: list[ApprovalRule]
    allowed_audience: list[str]
    access_policy: CapabilityAccessPolicy
    required_provider: str | None
    required_provider_scopes: list[str]
    allowed_environments: list[str]
    adapter_type: str
    adapter_config: dict[str, Any]
    publication_status: Literal["pending_review", "approved", "rejected", "active", "expired"]
    created_by_actor_type: str | None = None
    created_by_actor_id: str | None = None
    created_via_token_id: str | None = None
    reviewed_at: datetime | None = None

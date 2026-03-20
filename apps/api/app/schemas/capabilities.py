from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CapabilityCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "github.repo.sync",
            "secret_id": "secret-1",
            "risk_level": "medium",
            "allowed_mode": "proxy_or_lease",
            "lease_ttl_seconds": 120,
            "approval_mode": "auto",
            "allowed_audience": ["agent"],
            "required_provider": "github",
            "required_provider_scopes": ["repo"],
            "allowed_environments": ["production"],
            "adapter_type": "generic_http",
            "adapter_config": {},
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
    allowed_audience: list[str] = Field(
        default_factory=list,
        description="Optional audience labels that may use this capability.",
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
            "allowed_audience": ["agent"],
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
    allowed_audience: list[str]
    required_provider: str | None
    required_provider_scopes: list[str]
    allowed_environments: list[str]
    adapter_type: str
    adapter_config: dict[str, Any]

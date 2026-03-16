from pydantic import BaseModel, Field


class CapabilityCreate(BaseModel):
    name: str
    secret_id: str
    risk_level: str
    allowed_mode: str = "proxy_only"
    lease_ttl_seconds: int = 60
    approval_mode: str = "auto"
    allowed_audience: list[str] = Field(default_factory=list)


class CapabilityResponse(BaseModel):
    id: str
    name: str
    secret_id: str
    risk_level: str
    allowed_mode: str
    lease_ttl_seconds: int
    approval_mode: str
    allowed_audience: list[str]

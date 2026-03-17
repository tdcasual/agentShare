from pydantic import BaseModel, Field


class CapabilityRecord(BaseModel):
    id: str
    name: str
    secret_id: str
    allowed_mode: str = "proxy_only"
    lease_ttl_seconds: int = 60
    risk_level: str
    approval_mode: str = "auto"
    allowed_audience: list[str] = Field(default_factory=list)
    adapter_type: str = "generic_http"
    adapter_config: dict = Field(default_factory=dict)

from pydantic import BaseModel, Field


class AgentTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    ttl_seconds: int | None = Field(default=None, ge=60, le=31_536_000)


class GrantReplace(BaseModel):
    secret_ids: list[str] = Field(default_factory=list, max_length=10_000)

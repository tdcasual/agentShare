from typing import Any

from pydantic import BaseModel, Field


class SecretCreate(BaseModel):
    display_name: str
    kind: str
    value: str
    scope: dict[str, Any] = Field(default_factory=dict)


class SecretResponse(BaseModel):
    id: str
    display_name: str
    kind: str
    scope: dict[str, Any]
    backend_ref: str

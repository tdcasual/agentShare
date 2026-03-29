from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.config import ManagementRole

InvitedManagementRole = Literal["viewer", "operator", "admin"]


class AdminAccountCreate(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "email": "viewer@example.com",
            "display_name": "Viewer User",
            "password": "correct horse battery staple",
            "role": "viewer",
        },
    })

    email: str = Field(description="Unique email used for management login.")
    display_name: str = Field(description="Human-readable name displayed in the control plane.")
    password: str = Field(min_length=12, description="Initial password for the invited management account.")
    role: InvitedManagementRole = Field(description="Granted management role for the invited account.")


class AdminAccountResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: ManagementRole
    status: str
    last_login_at: datetime | None


class AdminAccountListResponse(BaseModel):
    items: list[AdminAccountResponse]


class AdminAccountDisableResponse(BaseModel):
    id: str
    status: str

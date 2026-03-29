from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.config import ManagementRole


class ManagementLoginRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "email": "owner@example.com",
            "password": "correct horse battery staple",
        },
    })

    email: str = Field(description="Persisted human account email used for management login.")
    password: str = Field(description="Password for the persisted human account.")


class ManagementSessionResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "status": "authenticated",
            "actor_type": "human",
            "actor_id": "management",
            "role": "admin",
            "auth_method": "session",
            "session_id": "session-123",
            "email": "owner@example.com",
            "expires_in": 43200,
            "issued_at": 1711584000,
            "expires_at": 1711627200,
        },
    })

    status: str
    actor_type: str
    actor_id: str
    role: ManagementRole
    auth_method: str
    session_id: str
    email: str
    expires_in: int
    issued_at: int
    expires_at: int


class ManagementSessionPayload(BaseModel):
    sub: str
    actor_id: str
    actor_type: str
    role: ManagementRole
    auth_method: str
    session_id: str
    email: str
    iat: int
    exp: int
    ver: int

    @model_validator(mode="after")
    def validate_payload(self) -> "ManagementSessionPayload":
        if not self.actor_id:
            raise ValueError("Management session actor_id is required.")
        if not self.session_id:
            raise ValueError("Management session session_id is required.")
        if not self.email:
            raise ValueError("Management session email is required.")
        if self.ver != 1:
            raise ValueError(f"Management session version {self.ver} is not supported.")
        if self.exp <= self.iat:
            raise ValueError("Management session expiry must be later than issue time.")
        return self

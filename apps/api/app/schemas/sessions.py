from pydantic import BaseModel, ConfigDict, Field, model_validator


class ManagementLoginRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "bootstrap_key": "changeme-bootstrap-key",
        },
    })

    bootstrap_key: str = Field(description="Bootstrap management credential used only to establish a human session.")


class ManagementSessionResponse(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "status": "authenticated",
            "actor_type": "human",
            "actor_id": "management",
            "role": "admin",
            "auth_method": "session",
            "session_id": "session-123",
            "expires_in": 43200,
            "issued_at": 1711584000,
            "expires_at": 1711627200,
        },
    })

    status: str
    actor_type: str
    actor_id: str
    role: str
    auth_method: str
    session_id: str
    expires_in: int
    issued_at: int
    expires_at: int


class ManagementSessionPayload(BaseModel):
    sub: str
    actor_id: str
    actor_type: str
    role: str
    auth_method: str
    session_id: str
    iat: int
    exp: int
    ver: int

    @model_validator(mode="after")
    def validate_payload(self) -> "ManagementSessionPayload":
        if not self.actor_id:
            raise ValueError("Management session actor_id is required.")
        if not self.session_id:
            raise ValueError("Management session session_id is required.")
        if self.ver != 1:
            raise ValueError(f"Management session version {self.ver} is not supported.")
        if self.exp <= self.iat:
            raise ValueError("Management session expiry must be later than issue time.")
        return self

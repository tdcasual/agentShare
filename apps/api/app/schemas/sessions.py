from pydantic import BaseModel, ConfigDict, Field


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
            "expires_in": 43200,
        },
    })

    status: str
    actor_type: str
    actor_id: str
    role: str
    expires_in: int

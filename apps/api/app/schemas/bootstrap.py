from pydantic import BaseModel, ConfigDict, Field


class BootstrapStatusResponse(BaseModel):
    initialized: bool


class BootstrapOwnerSetupRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "bootstrap_key": "changeme-bootstrap-key",
            "email": "owner@example.com",
            "display_name": "Founding Owner",
            "password": "correct horse battery staple",
        },
    })

    bootstrap_key: str = Field(max_length=128, description="Bootstrap credential required for one-time owner setup.")
    email: str = Field(max_length=320, description="Owner email address.")
    display_name: str = Field(max_length=255, description="Human-readable owner display name.")
    password: str = Field(min_length=12, max_length=128, description="Initial owner password.")


class BootstrapAccountResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    status: str


class BootstrapOwnerSetupResponse(BaseModel):
    initialized: bool
    account: BootstrapAccountResponse

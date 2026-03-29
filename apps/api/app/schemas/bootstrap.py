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

    bootstrap_key: str = Field(description="Bootstrap credential required for one-time owner setup.")
    email: str = Field(description="Owner email address.")
    display_name: str = Field(description="Human-readable owner display name.")
    password: str = Field(description="Initial owner password.")


class BootstrapAccountResponse(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    status: str


class BootstrapOwnerSetupResponse(BaseModel):
    initialized: bool
    account: BootstrapAccountResponse

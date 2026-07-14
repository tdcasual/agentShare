from typing import Self

from pydantic import BaseModel, Field, model_validator


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, pattern="^(active|disabled)$")

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> Self:
        required_fields = {"name", "status"}
        null_fields = required_fields.intersection(self.model_fields_set)
        if any(getattr(self, field) is None for field in null_fields):
            raise ValueError("name and status cannot be null")
        return self

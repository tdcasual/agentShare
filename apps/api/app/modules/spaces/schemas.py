from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

SpaceRoleValue = Literal["reader", "contributor", "maintainer"]


class SpaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)


class SpaceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    status: Literal["active", "archived"] | None = None


class MembershipInput(BaseModel):
    token_id: str = Field(min_length=1, max_length=255)
    role: SpaceRoleValue
    status: Literal["active", "revoked"] = "active"


class MembershipReplace(BaseModel):
    members: list[MembershipInput] = Field(max_length=2000)

    @model_validator(mode="after")
    def reject_duplicate_tokens(self) -> MembershipReplace:
        token_ids = [member.token_id for member in self.members]
        if len(token_ids) != len(set(token_ids)):
            raise ValueError("members must contain unique token ids")
        return self

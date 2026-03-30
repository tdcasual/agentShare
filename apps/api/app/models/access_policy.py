from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


TokenAccessPolicyMode = Literal["all_tokens", "explicit_tokens"]


class TokenAccessPolicy(BaseModel):
    mode: TokenAccessPolicyMode = Field(default="all_tokens")
    token_ids: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize(self) -> "TokenAccessPolicy":
        if self.mode == "all_tokens":
            self.token_ids = []
            return self

        deduped = list(dict.fromkeys(self.token_ids))
        if not deduped:
            raise ValueError("Explicit token targeting requires token_ids")
        self.token_ids = deduped
        return self

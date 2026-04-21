from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_serializer, model_validator


CapabilityAccessPolicyMode = Literal["all_access_tokens", "selectors"]
CapabilityAccessSelectorKind = Literal["access_token", "access_token_label"]


class CapabilityAccessSelector(BaseModel):
    kind: CapabilityAccessSelectorKind
    ids: list[str] = Field(default_factory=list)
    key: str | None = None
    values: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize(self) -> "CapabilityAccessSelector":
        if self.kind == "access_token":
            self.key = None
            self.values = []
            self.ids = list(dict.fromkeys(self.ids))
            if not self.ids:
                raise ValueError("access_token selectors require ids")
            return self

        self.ids = []
        self.values = list(dict.fromkeys(self.values))
        if not self.key:
            raise ValueError("access_token_label selectors require key")
        if not self.values:
            raise ValueError("access_token_label selectors require values")
        return self

    @model_serializer(mode="plain")
    def serialize(self) -> dict:
        if self.kind == "access_token":
            return {
                "kind": self.kind,
                "ids": self.ids,
            }
        return {
            "kind": "access_token_label",
            "key": self.key,
            "values": self.values,
        }


class CapabilityAccessPolicy(BaseModel):
    mode: CapabilityAccessPolicyMode = Field(default="all_access_tokens")
    selectors: list[CapabilityAccessSelector] = Field(default_factory=list)

    @model_validator(mode="after")
    def normalize(self) -> "CapabilityAccessPolicy":
        if self.mode == "all_access_tokens":
            self.selectors = []
            return self

        if not self.selectors:
            raise ValueError("Selector mode requires selectors")
        return self

    @model_serializer(mode="plain")
    def serialize(self) -> dict:
        if self.mode == "all_access_tokens":
            return {"mode": "all_access_tokens", "selectors": []}
        return {
            "mode": "selectors",
            "selectors": [selector.serialize() for selector in self.selectors],
        }

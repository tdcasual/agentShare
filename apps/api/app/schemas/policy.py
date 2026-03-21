from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


PolicyDecision = Literal["allow", "manual", "deny"]
PolicyActionType = Literal["invoke", "lease"]


class ApprovalRule(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "decision": "manual",
            "reason": "High-risk production invokes require review",
            "action_types": ["invoke"],
            "risk_levels": ["high"],
            "providers": ["openai"],
            "environments": ["production"],
            "task_types": ["prompt_run"],
        },
    })

    decision: PolicyDecision
    reason: str = Field(description="Human-readable explanation for the rule match.")
    action_types: list[PolicyActionType] = Field(default_factory=list)
    risk_levels: list[str] = Field(default_factory=list)
    providers: list[str] = Field(default_factory=list)
    environments: list[str] = Field(default_factory=list)
    task_types: list[str] = Field(default_factory=list)

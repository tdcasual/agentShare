from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.config import Settings
from app.models.agent import AgentIdentity
from app.services.gateway import issue_lease, proxy_invoke
from app.services.openclaw_tool_catalog_service import (
    OPENCLAW_TOOL_CATALOG,
    canonical_tool_name,
)
from app.services.playbook_service import search_playbooks
from app.services.task_service import claim_task, complete_task, list_tasks


class ToolExecutionError(RuntimeError):
    def __init__(self, status_code: int, detail: Any):
        super().__init__(str(detail))
        self.status_code = status_code
        self.detail = detail


class ListTasksArgs(BaseModel):
    status: str | None = None
    task_type: str | None = None


class ClaimTaskArgs(BaseModel):
    task_id: str


class CompleteTaskArgs(BaseModel):
    task_id: str
    result_summary: str
    output_payload: dict[str, Any] = Field(default_factory=dict)


class SearchPlaybooksArgs(BaseModel):
    task_type: str | None = None
    q: str | None = None
    tag: str | None = None


class InvokeCapabilityArgs(BaseModel):
    capability_id: str
    task_id: str
    parameters: dict[str, Any] = Field(default_factory=dict)


class RequestCapabilityLeaseArgs(BaseModel):
    capability_id: str
    task_id: str
    purpose: str


TOOL_MODELS: dict[str, type[BaseModel]] = {
    "tasks.list": ListTasksArgs,
    "tasks.claim": ClaimTaskArgs,
    "tasks.complete": CompleteTaskArgs,
    "playbooks.search": SearchPlaybooksArgs,
    "capabilities.invoke": InvokeCapabilityArgs,
    "capabilities.request_lease": RequestCapabilityLeaseArgs,
}

TOOL_DESCRIPTIONS = {
    "tasks.list": "List available tasks so an agent can discover work before claiming it.",
    "tasks.claim": "Claim one pending task that the current agent is allowed to execute.",
    "tasks.complete": "Complete a task already claimed by the current agent and store the run result.",
    "playbooks.search": "Search reusable playbooks by task type, free-text query, and tag.",
    "capabilities.invoke": "Invoke a capability through proxy mode while preserving policy and approval semantics.",
    "capabilities.request_lease": "Request a short-lived capability lease when the task and capability both allow it.",
}


def list_tool_definitions() -> list[dict[str, Any]]:
    return [
        {
            "name": name,
            "description": TOOL_DESCRIPTIONS[name],
            "inputSchema": model.model_json_schema(),
            "legacyName": OPENCLAW_TOOL_CATALOG[name]["legacy_name"],
        }
        for name, model in TOOL_MODELS.items()
    ]


def execute_tool(
    *,
    name: str,
    arguments: dict[str, Any],
    session: Session,
    agent: AgentIdentity,
    settings: Settings,
) -> Any:
    canonical_name = canonical_tool_name(name)
    if canonical_name is None:
        raise ToolExecutionError(status_code=404, detail=f"Unknown MCP tool: {name}")

    model = TOOL_MODELS.get(canonical_name)
    if model is None:
        raise ToolExecutionError(status_code=404, detail=f"Unknown MCP tool: {name}")

    try:
        parsed = model.model_validate(arguments)
    except ValidationError as exc:
        raise ToolExecutionError(status_code=422, detail=exc.errors()) from exc

    if canonical_name == "tasks.list":
        result = list_tasks(session, actor=agent)
        if parsed.status:
            result = [item for item in result if item["status"] == parsed.status]
        if parsed.task_type:
            result = [item for item in result if item["task_type"] == parsed.task_type]
        return {"items": result}
    if canonical_name == "tasks.claim":
        return claim_task(session, parsed.task_id, agent, settings=settings)
    if canonical_name == "tasks.complete":
        return complete_task(
            session,
            parsed.task_id,
            agent,
            parsed.result_summary,
            parsed.output_payload,
        )
    if canonical_name == "playbooks.search":
        result = search_playbooks(
            session,
            task_type=parsed.task_type,
            query=parsed.q,
            tag=parsed.tag,
        )
        return {
            "items": result.items,
            "meta": {
                "total": result.total,
                "items_count": len(result.items),
                "applied_filters": result.applied_filters,
            },
        }
    if canonical_name == "capabilities.invoke":
        return proxy_invoke(
            session,
            parsed.capability_id,
            parsed.task_id,
            parsed.parameters,
            agent,
            settings=settings,
        )
    if canonical_name == "capabilities.request_lease":
        return issue_lease(
            session,
            parsed.capability_id,
            parsed.task_id,
            parsed.purpose,
            agent,
            settings=settings,
        )

    raise ToolExecutionError(status_code=404, detail=f"Unknown MCP tool: {name}")

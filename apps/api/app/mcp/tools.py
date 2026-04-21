from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.auth import ensure_task_type_allowed
from app.config import Settings
from app.errors import ConflictError, DomainError
from app.models.runtime_principal import RuntimePrincipal
from app.schemas.tasks import TaskCreate
from app.services.gateway import issue_lease, proxy_invoke
from app.services.openclaw_dream_service import (
    ensure_followup_task_allowed,
    record_dream_step,
    register_followup_task,
    start_dream_run,
    stop_dream_run,
    stop_dream_run_with_event,
)
from app.services.openclaw_memory_service import create_memory_note, search_memory_notes
from app.services.openclaw_tool_catalog_service import (
    canonical_tool_name,
)
from app.services.playbook_service import search_playbooks
from app.services.task_service import claim_task, complete_task, create_task, list_tasks


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


class StartDreamRunArgs(BaseModel):
    objective: str
    task_id: str | None = None
    step_budget: int | None = None


class RecordDreamStepArgs(BaseModel):
    run_id: str
    step_type: str
    status: str = "completed"
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] = Field(default_factory=dict)
    token_usage: dict[str, Any] = Field(default_factory=dict)
    created_task_id: str | None = None


class StopDreamRunArgs(BaseModel):
    run_id: str
    stop_reason: str


class SearchMemoryArgs(BaseModel):
    scope: str | None = None
    tag: str | None = None
    q: str | None = None


class WriteMemoryArgs(BaseModel):
    scope: str = "agent"
    kind: str = "working_note"
    importance: str = "medium"
    tags: list[str] = Field(default_factory=list)
    content: str
    run_id: str | None = None


class ProposeFollowupTaskArgs(BaseModel):
    run_id: str
    title: str
    task_type: str
    input: dict[str, Any] = Field(default_factory=dict)
    required_capability_ids: list[str] = Field(default_factory=list)
    playbook_ids: list[str] = Field(default_factory=list)
    lease_allowed: bool = False
    approval_mode: str = "auto"


TOOL_MODELS: dict[str, type[BaseModel]] = {
    "tasks.list": ListTasksArgs,
    "tasks.claim": ClaimTaskArgs,
    "tasks.complete": CompleteTaskArgs,
    "playbooks.search": SearchPlaybooksArgs,
    "capabilities.invoke": InvokeCapabilityArgs,
    "capabilities.request_lease": RequestCapabilityLeaseArgs,
    "dream.runs.start": StartDreamRunArgs,
    "dream.runs.record_step": RecordDreamStepArgs,
    "dream.runs.stop": StopDreamRunArgs,
    "dream.memory.search": SearchMemoryArgs,
    "dream.memory.write": WriteMemoryArgs,
    "dream.tasks.propose_followup": ProposeFollowupTaskArgs,
}

TOOL_DESCRIPTIONS = {
    "tasks.list": "List available tasks so an agent can discover work before claiming it.",
    "tasks.claim": "Claim one pending task that the current agent is allowed to execute.",
    "tasks.complete": "Complete a task already claimed by the current agent and store the run result.",
    "playbooks.search": "Search reusable playbooks by task type, free-text query, and tag.",
    "capabilities.invoke": "Invoke a capability through proxy mode while preserving policy and approval semantics.",
    "capabilities.request_lease": "Request a short-lived capability lease when the task and capability both allow it.",
    "dream.runs.start": "Start one explicit bounded dream run for the current runtime session.",
    "dream.runs.record_step": "Record one explicit plan, reflection, or follow-up step in a dream run.",
    "dream.runs.stop": "Stop one active dream run with an explicit stop reason.",
    "dream.memory.search": "Search explicit memory notes visible to the current runtime agent.",
    "dream.memory.write": "Persist one explicit memory note visible to the current runtime agent.",
    "dream.tasks.propose_followup": "Create one bounded follow-up task proposal from an active dream run.",
}


def list_tool_definitions() -> list[dict[str, Any]]:
    return [
        {
            "name": name,
            "description": TOOL_DESCRIPTIONS[name],
            "inputSchema": model.model_json_schema(),
        }
        for name, model in TOOL_MODELS.items()
    ]


def execute_tool(
    *,
    name: str,
    arguments: dict[str, Any],
    session: Session,
    agent: RuntimePrincipal,
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

    try:
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
        if canonical_name == "dream.runs.start":
            return start_dream_run(
                session,
                agent=agent,
                objective=parsed.objective,
                task_id=parsed.task_id,
                step_budget=parsed.step_budget,
            )
        if canonical_name == "dream.runs.record_step":
            return record_dream_step(
                session,
                run_id=parsed.run_id,
                agent=agent,
                step_type=parsed.step_type,
                status=parsed.status,
                input_payload=parsed.input_payload,
                output_payload=parsed.output_payload,
                token_usage=parsed.token_usage,
                created_task_id=parsed.created_task_id,
            )
        if canonical_name == "dream.runs.stop":
            return stop_dream_run(
                session,
                run_id=parsed.run_id,
                agent=agent,
                stop_reason=parsed.stop_reason,
            )
        if canonical_name == "dream.memory.search":
            return {
                "items": search_memory_notes(
                    session,
                    agent=agent,
                    scope=parsed.scope,
                    tag=parsed.tag,
                    query=parsed.q,
                )
            }
        if canonical_name == "dream.memory.write":
            return create_memory_note(
                session,
                agent=agent,
                scope=parsed.scope,
                kind=parsed.kind,
                importance=parsed.importance,
                tags=parsed.tags,
                content=parsed.content,
                run_id=parsed.run_id,
            )
        if canonical_name == "dream.tasks.propose_followup":
            try:
                ensure_followup_task_allowed(session, run_id=parsed.run_id, agent=agent)
                ensure_task_type_allowed(agent, parsed.task_type)
                with session.begin_nested():
                    task = create_task(
                        session,
                        TaskCreate(
                            title=parsed.title,
                            task_type=parsed.task_type,
                            input=parsed.input,
                            required_capability_ids=parsed.required_capability_ids,
                            playbook_ids=parsed.playbook_ids,
                            lease_allowed=parsed.lease_allowed,
                            approval_mode=parsed.approval_mode,
                        ),
                        actor=type(
                            "DreamActor",
                            (),
                            {
                                "actor_type": "agent",
                                "id": agent.id,
                                "token_id": agent.token_id,
                            },
                        )(),
                    )
                    dream = register_followup_task(
                        session,
                        run_id=parsed.run_id,
                        agent=agent,
                        created_task_id=task["id"],
                    )
                return {
                    "task": task,
                    "dream": dream,
                }
            except DomainError as exc:
                should_stop_run = not isinstance(exc, ConflictError) or (
                    exc.detail == "Dream run follow-up task budget exhausted"
                )
                if should_stop_run:
                    stop_reason = (
                        "budget_exhausted"
                        if exc.detail == "Dream run follow-up task budget exhausted"
                        else "task_proposal_disallowed"
                    )
                    stop_dream_run_with_event(
                        session,
                        run_id=parsed.run_id,
                        agent=agent,
                        stop_reason=stop_reason,
                        detail=exc.detail,
                    )
                _raise_tool_error_from_domain_error(exc)
            except PermissionError as exc:
                stop_dream_run_with_event(
                    session,
                    run_id=parsed.run_id,
                    agent=agent,
                    stop_reason="task_proposal_disallowed",
                    detail=str(exc),
                )
                raise ToolExecutionError(status_code=403, detail=str(exc)) from exc
    except DomainError as exc:
        _raise_tool_error_from_domain_error(exc)

    raise ToolExecutionError(status_code=404, detail=f"Unknown MCP tool: {name}")


def _raise_tool_error_from_domain_error(exc: DomainError) -> None:
    raise ToolExecutionError(status_code=exc.status_code, detail=exc.detail) from exc

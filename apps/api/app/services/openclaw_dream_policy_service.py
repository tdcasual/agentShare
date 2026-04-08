from __future__ import annotations

from app.errors import AuthorizationError, ConflictError
from app.models.agent import AgentIdentity


DEFAULT_DREAM_POLICY = {
    "enabled": False,
    "max_steps_per_run": 3,
    "max_followup_tasks": 0,
    "allow_task_proposal": False,
    "allow_memory_write": False,
    "require_human_review_for_followups": True,
    "max_context_tokens": 4096,
}


def normalize_dream_policy(policy: dict | None) -> dict:
    normalized = {**DEFAULT_DREAM_POLICY}
    if policy:
        normalized.update(policy)
    normalized["max_steps_per_run"] = max(int(normalized.get("max_steps_per_run", 3)), 1)
    normalized["max_followup_tasks"] = max(int(normalized.get("max_followup_tasks", 0)), 0)
    normalized["max_context_tokens"] = max(int(normalized.get("max_context_tokens", 4096)), 1)
    normalized["enabled"] = bool(normalized.get("enabled", False))
    normalized["allow_task_proposal"] = bool(normalized.get("allow_task_proposal", False))
    normalized["allow_memory_write"] = bool(normalized.get("allow_memory_write", False))
    normalized["require_human_review_for_followups"] = bool(
        normalized.get("require_human_review_for_followups", True)
    )
    return normalized


def ensure_dream_mode_enabled(agent: AgentIdentity) -> dict:
    policy = normalize_dream_policy(agent.dream_policy)
    if not policy["enabled"]:
        raise AuthorizationError("Dream mode is disabled for this agent")
    return policy


def ensure_followup_tasks_allowed(agent: AgentIdentity) -> dict:
    policy = ensure_dream_mode_enabled(agent)
    if not policy["allow_task_proposal"]:
        raise AuthorizationError("Dream mode task proposals are disabled for this agent")
    return policy


def ensure_memory_write_allowed(agent: AgentIdentity) -> dict:
    policy = ensure_dream_mode_enabled(agent)
    if not policy["allow_memory_write"]:
        raise AuthorizationError("Dream mode memory writes are disabled for this agent")
    return policy


def ensure_step_budget_remaining(*, consumed_steps: int, step_budget: int) -> None:
    if consumed_steps >= step_budget:
        raise ConflictError("Dream run step budget exhausted")


def ensure_followup_budget_remaining(*, created_followup_tasks: int, max_followup_tasks: int) -> None:
    if created_followup_tasks >= max_followup_tasks:
        raise ConflictError("Dream run follow-up task budget exhausted")

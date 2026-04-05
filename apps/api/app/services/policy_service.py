from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.config import ManagementRole


PolicyDecision = Literal["allow", "manual", "deny"]
PolicySource = Literal["task", "capability", "default"]
ManagementAction = Literal[
    "admin_accounts:list",
    "admin_accounts:create",
    "admin_accounts:disable",
    "agents:list",
    "agents:create",
    "agents:delete",
    "playbooks:create",
    "reviews:list",
    "reviews:decide",
    "tasks:create",
    "tokens:list",
    "tokens:issue",
    "tokens:revoke",
]

MANAGEMENT_ROLE_LEVELS: dict[ManagementRole, int] = {
    "viewer": 0,
    "operator": 1,
    "admin": 2,
    "owner": 3,
}

MANAGEMENT_ACTION_MINIMUM_ROLES: dict[ManagementAction, ManagementRole] = {
    "admin_accounts:list": "admin",
    "admin_accounts:create": "admin",
    "admin_accounts:disable": "admin",
    "agents:list": "admin",
    "agents:create": "admin",
    "agents:delete": "owner",
    "playbooks:create": "operator",
    "reviews:list": "operator",
    "reviews:decide": "operator",
    "tasks:create": "operator",
    "tokens:list": "admin",
    "tokens:issue": "admin",
    "tokens:revoke": "admin",
}


@dataclass(frozen=True)
class PolicyRule:
    decision: PolicyDecision
    reason: str
    action_types: list[str] = field(default_factory=list)
    risk_levels: list[str] = field(default_factory=list)
    providers: list[str] = field(default_factory=list)
    environments: list[str] = field(default_factory=list)
    task_types: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class PolicyContext:
    action_type: str
    risk_level: str
    provider: str | None
    environment: str | None
    task_type: str
    capability_name: str


@dataclass(frozen=True)
class PolicyOutcome:
    decision: PolicyDecision
    reason: str
    source: PolicySource


def minimum_role_for_management_action(action: ManagementAction) -> ManagementRole:
    return MANAGEMENT_ACTION_MINIMUM_ROLES[action]


def can_management_role_perform_action(role: ManagementRole, action: ManagementAction) -> bool:
    minimum_role = minimum_role_for_management_action(action)
    return MANAGEMENT_ROLE_LEVELS[role] >= MANAGEMENT_ROLE_LEVELS[minimum_role]


def ensure_management_action_allowed(role: ManagementRole, action: ManagementAction) -> None:
    minimum_role = minimum_role_for_management_action(action)
    if not can_management_role_perform_action(role, action):
        raise PermissionError(f"{minimum_role} role required")


def evaluate_policy(
    *,
    task_rules: list[dict] | list[PolicyRule],
    capability_rules: list[dict] | list[PolicyRule],
    context: PolicyContext,
    task_approval_mode: str,
    capability_approval_mode: str,
) -> PolicyOutcome:
    task_matches = _matching_rules(task_rules, context)
    capability_matches = _matching_rules(capability_rules, context)

    for decision in ("deny", "manual", "allow"):
        task_match = _first_with_decision(task_matches, decision)
        if task_match is not None:
            return PolicyOutcome(decision=decision, reason=task_match.reason, source="task")

        capability_match = _first_with_decision(capability_matches, decision)
        if capability_match is not None:
            return PolicyOutcome(decision=decision, reason=capability_match.reason, source="capability")

    if task_approval_mode == "manual":
        return PolicyOutcome(
            decision="manual",
            reason="Task approval mode requires review",
            source="task",
        )
    if capability_approval_mode == "manual":
        return PolicyOutcome(
            decision="manual",
            reason="Capability approval mode requires review",
            source="capability",
        )

    return PolicyOutcome(
        decision="allow",
        reason="No approval policy matched",
        source="default",
    )


def _matching_rules(
    rules: list[dict] | list[PolicyRule],
    context: PolicyContext,
) -> list[PolicyRule]:
    normalized_rules = [_normalize_rule(rule) for rule in rules]
    return [rule for rule in normalized_rules if _matches(rule, context)]


def _normalize_rule(rule: dict | PolicyRule) -> PolicyRule:
    if isinstance(rule, PolicyRule):
        return rule
    return PolicyRule(
        decision=rule["decision"],
        reason=rule["reason"],
        action_types=list(rule.get("action_types", [])),
        risk_levels=list(rule.get("risk_levels", [])),
        providers=list(rule.get("providers", [])),
        environments=list(rule.get("environments", [])),
        task_types=list(rule.get("task_types", [])),
    )


def _matches(rule: PolicyRule, context: PolicyContext) -> bool:
    if rule.action_types and context.action_type not in rule.action_types:
        return False
    if rule.risk_levels and context.risk_level not in rule.risk_levels:
        return False
    if rule.providers and context.provider not in rule.providers:
        return False
    if rule.environments and context.environment not in rule.environments:
        return False
    if rule.task_types and context.task_type not in rule.task_types:
        return False
    return True


def _first_with_decision(rules: list[PolicyRule], decision: str) -> PolicyRule | None:
    for rule in rules:
        if rule.decision == decision:
            return rule
    return None

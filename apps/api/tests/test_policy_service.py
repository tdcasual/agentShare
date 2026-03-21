from app.services.policy_service import (
    PolicyContext,
    PolicyRule,
    evaluate_policy,
)


def test_policy_evaluator_prefers_deny_over_manual_and_allow():
    outcome = evaluate_policy(
        task_rules=[
            PolicyRule(decision="allow", reason="Task explicitly allows this run"),
        ],
        capability_rules=[
            PolicyRule(
                decision="manual",
                reason="Medium risk invokes require review",
                risk_levels=["medium"],
            ),
            PolicyRule(
                decision="deny",
                reason="Production openai invokes are denied",
                action_types=["invoke"],
                providers=["openai"],
                environments=["production"],
            ),
        ],
        context=PolicyContext(
            action_type="invoke",
            risk_level="medium",
            provider="openai",
            environment="production",
            task_type="prompt_run",
            capability_name="openai.chat.invoke",
        ),
        task_approval_mode="auto",
        capability_approval_mode="auto",
    )

    assert outcome.decision == "deny"
    assert outcome.reason == "Production openai invokes are denied"
    assert outcome.source == "capability"


def test_policy_evaluator_falls_back_to_approval_mode_without_matching_rules():
    outcome = evaluate_policy(
        task_rules=[],
        capability_rules=[],
        context=PolicyContext(
            action_type="lease",
            risk_level="low",
            provider="github",
            environment="staging",
            task_type="account_read",
            capability_name="github.repo.read",
        ),
        task_approval_mode="auto",
        capability_approval_mode="manual",
    )

    assert outcome.decision == "manual"
    assert outcome.reason == "Capability approval mode requires review"
    assert outcome.source == "capability"

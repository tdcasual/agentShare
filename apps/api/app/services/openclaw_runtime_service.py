from __future__ import annotations

from app.models.runtime_principal import RuntimePrincipal
from app.orm.openclaw_agent import OpenClawAgentModel
from app.orm.openclaw_session import OpenClawSessionModel
from app.services.openclaw_dream_policy_service import normalize_dream_policy


def build_runtime_principal(
    *,
    agent: OpenClawAgentModel,
    session: OpenClawSessionModel,
    session_key: str | None = None,
) -> RuntimePrincipal:
    return RuntimePrincipal(
        actor_type="openclaw_agent",
        id=agent.id,
        name=agent.name,
        issuer="openclaw",
        auth_method=agent.auth_method,
        status=agent.status,
        token_id=None,
        token_prefix=None,
        subject_type=None,
        subject_id=None,
        expires_at=None,
        scopes=["runtime"],
        labels={"channel": session.channel},
        allowed_capability_ids=agent.allowed_capability_ids or [],
        allowed_task_types=agent.allowed_task_types or [],
        risk_tier=agent.risk_tier,
        session_id=session.id,
        session_key=session_key,
        workspace_root=agent.workspace_root,
        agent_dir=agent.agent_dir,
        sandbox_mode=agent.sandbox_mode,
        tools_policy=agent.tools_policy or {},
        skills_policy=agent.skills_policy or {},
        dream_policy=normalize_dream_policy(agent.dream_policy or {}),
    )

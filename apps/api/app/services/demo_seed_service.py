from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import Settings
from app.orm.agent import AgentIdentityModel
from app.orm.capability import CapabilityModel
from app.orm.event import EventModel
from app.orm.secret import SecretModel
from app.orm.task import TaskModel
from app.repositories.agent_repo import AgentRepository
from app.repositories.capability_repo import CapabilityRepository
from app.repositories.event_repo import EventRepository
from app.repositories.human_account_repo import HumanAccountRepository
from app.repositories.secret_repo import SecretRepository
from app.repositories.system_setting_repo import SystemSettingRepository
from app.repositories.task_repo import TaskRepository
from app.services.admin_account_service import create_admin_account
from app.services.bootstrap_service import BOOTSTRAP_INITIALIZED_KEY, create_first_owner, is_bootstrap_initialized

DEMO_OWNER_EMAIL = "owner@example.com"
DEMO_OWNER_PASSWORD = "correct horse battery staple"
DEMO_OWNER_DISPLAY_NAME = "Demo Owner"
DEMO_AGENT_ID = "market-maker"
DEMO_AGENT_NAME = "Market Maker Agent"

DEMO_SECRET_ACTIVE_ID = "secret-demo-market-active"
DEMO_SECRET_PENDING_ID = "secret-demo-market-pending"
DEMO_CAPABILITY_ACTIVE_ID = "capability-demo-market-status"
DEMO_CAPABILITY_PENDING_ID = "capability-demo-market-risk"
DEMO_TASK_ID = "task-demo-market-readiness"
DEMO_EVENT_REVIEW_ID = "event-demo-market-review"
DEMO_EVENT_FEEDBACK_ID = "event-demo-market-feedback"
DEMO_SEED_KEY = "demo.seed.v1"


def seed_demo_fixture_data(settings: Settings, session_factory) -> None:
    if not settings.demo_seed_enabled or settings.is_production_like():
        return

    session = session_factory()
    try:
        owner = _ensure_demo_owner(session)
        _ensure_demo_agent(session)
        _ensure_demo_secret(
            session,
            secret_id=DEMO_SECRET_ACTIVE_ID,
            display_name="Market Access Vault",
            provider="openai",
            publication_status="active",
            reviewed_by_actor_id=owner.id,
            reviewed_at=datetime.now(timezone.utc),
        )
        _ensure_demo_secret(
            session,
            secret_id=DEMO_SECRET_PENDING_ID,
            display_name="Market Review Sandbox",
            provider="anthropic",
            publication_status="pending_review",
            reviewed_by_actor_id=None,
            reviewed_at=None,
        )
        _ensure_demo_capability(
            session,
            capability_id=DEMO_CAPABILITY_ACTIVE_ID,
            secret_id=DEMO_SECRET_ACTIVE_ID,
            name="market.status.digest",
            required_provider="openai",
            publication_status="active",
            reviewed_by_actor_id=owner.id,
            reviewed_at=datetime.now(timezone.utc),
        )
        _ensure_demo_capability(
            session,
            capability_id=DEMO_CAPABILITY_PENDING_ID,
            secret_id=DEMO_SECRET_PENDING_ID,
            name="market.risk.alert",
            required_provider="anthropic",
            publication_status="pending_review",
            reviewed_by_actor_id=None,
            reviewed_at=None,
        )
        _ensure_demo_task(session)
        _ensure_demo_review_event(session)
        _ensure_demo_feedback_event(session)
        SystemSettingRepository(session).set_json(
            DEMO_SEED_KEY,
            {
                "enabled": True,
                "owner_email": DEMO_OWNER_EMAIL,
            },
        )
        session.commit()
    finally:
        session.close()


def _ensure_demo_owner(session: Session):
    repo = HumanAccountRepository(session)
    existing = repo.get_by_email(DEMO_OWNER_EMAIL)
    if existing is not None:
        return existing

    if is_bootstrap_initialized(session):
        return create_admin_account(
            session,
            email=DEMO_OWNER_EMAIL,
            display_name=DEMO_OWNER_DISPLAY_NAME,
            password=DEMO_OWNER_PASSWORD,
            role="owner",
        )

    owner = create_first_owner(
        session,
        email=DEMO_OWNER_EMAIL,
        display_name=DEMO_OWNER_DISPLAY_NAME,
        password=DEMO_OWNER_PASSWORD,
    )
    SystemSettingRepository(session).set_json(BOOTSTRAP_INITIALIZED_KEY, {"initialized": True})
    return owner


def _ensure_demo_agent(session: Session) -> AgentIdentityModel:
    repo = AgentRepository(session)
    existing = repo.get(DEMO_AGENT_ID)
    if existing is not None:
        return existing

    return repo.create(AgentIdentityModel(
        id=DEMO_AGENT_ID,
        name=DEMO_AGENT_NAME,
        api_key_hash=None,
        status="active",
        allowed_capability_ids=[],
        allowed_task_types=["account_read", "prompt_run"],
        risk_tier="medium",
    ))


def _ensure_demo_secret(
    session: Session,
    *,
    secret_id: str,
    display_name: str,
    provider: str,
    publication_status: str,
    reviewed_by_actor_id: str | None,
    reviewed_at: datetime | None,
) -> SecretModel:
    repo = SecretRepository(session)
    existing = repo.get(secret_id)
    if existing is not None:
        return existing

    return repo.create(SecretModel(
        id=secret_id,
        display_name=display_name,
        kind="api_token",
        scope={"demo": True},
        provider=provider,
        environment="production",
        provider_scopes=["responses.read"],
        resource_selector="project:market-demo",
        metadata_json={"demo": True, "surface": "marketplace"},
        backend_ref=f"demo://{secret_id}",
        created_by="agent",
        created_by_actor_type="agent",
        created_by_actor_id=DEMO_AGENT_ID,
        created_via_token_id=None,
        publication_status=publication_status,
        reviewed_by_actor_id=reviewed_by_actor_id,
        reviewed_at=reviewed_at,
    ))


def _ensure_demo_capability(
    session: Session,
    *,
    capability_id: str,
    secret_id: str,
    name: str,
    required_provider: str,
    publication_status: str,
    reviewed_by_actor_id: str | None,
    reviewed_at: datetime | None,
) -> CapabilityModel:
    repo = CapabilityRepository(session)
    existing = repo.get(capability_id)
    if existing is not None:
        return existing

    return repo.create(CapabilityModel(
        id=capability_id,
        name=name,
        secret_id=secret_id,
        allowed_mode="proxy_only",
        lease_ttl_seconds=120,
        risk_level="medium",
        approval_mode="manual",
        approval_rules=[],
        allowed_audience=["management"],
        access_policy={"mode": "all_tokens", "selectors": []},
        required_provider=required_provider,
        required_provider_scopes=["responses.read"],
        allowed_environments=["production"],
        adapter_type="generic_http",
        adapter_config={"demo": True},
        created_by_actor_type="agent",
        created_by_actor_id=DEMO_AGENT_ID,
        created_via_token_id=None,
        publication_status=publication_status,
        reviewed_by_actor_id=reviewed_by_actor_id,
        reviewed_at=reviewed_at,
    ))


def _ensure_demo_task(session: Session) -> TaskModel:
    repo = TaskRepository(session)
    existing = repo.get(DEMO_TASK_ID)
    if existing is not None:
        return existing

    return repo.create(TaskModel(
        id=DEMO_TASK_ID,
        title="Market readiness review",
        task_type="account_read",
        input={"topic": "marketplace rollout"},
        required_capability_ids=[],
        playbook_ids=[],
        lease_allowed=False,
        approval_mode="manual",
        approval_rules=[],
        priority="high",
        status="pending",
        created_by="human",
        created_by_actor_type="human",
        created_by_actor_id="owner@example.com",
        created_via_token_id=None,
        publication_status="active",
    ))


def _ensure_demo_review_event(session: Session) -> EventModel:
    repo = EventRepository(session)
    existing = repo.get(DEMO_EVENT_REVIEW_ID)
    if existing is not None:
        return existing

    return repo.create(EventModel(
        id=DEMO_EVENT_REVIEW_ID,
        event_type="agent_submission_pending_review",
        actor_type="agent",
        actor_id=DEMO_AGENT_ID,
        subject_type="review",
        subject_id=DEMO_CAPABILITY_PENDING_ID,
        summary="Market Maker Agent submitted market.risk.alert for review",
        details="Human operators should review the pending market alert capability before broad marketplace rollout.",
        severity="warning",
        action_url=None,
        metadata_json={
            "resource_kind": "capability",
            "resource_id": DEMO_CAPABILITY_PENDING_ID,
        },
    ))


def _ensure_demo_feedback_event(session: Session) -> EventModel:
    repo = EventRepository(session)
    existing = repo.get(DEMO_EVENT_FEEDBACK_ID)
    if existing is not None:
        return existing

    return repo.create(EventModel(
        id=DEMO_EVENT_FEEDBACK_ID,
        event_type="agent_feedback_received",
        actor_type="agent",
        actor_id=DEMO_AGENT_ID,
        subject_type="agent",
        subject_id=DEMO_AGENT_ID,
        summary="Market Maker Agent shared a market-ready status digest",
        details="Agent feedback is ready for operators to inspect across inbox, identities, and marketplace surfaces.",
        severity="info",
        action_url=f"/identities?agentId={DEMO_AGENT_ID}",
        metadata_json={
            "channel": "marketplace_broadcast",
        },
    ))

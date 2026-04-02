from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.orm.task import TaskModel
from app.repositories.task_repo import TaskRepository
from app.services.approval_service import approve_request, require_runtime_approval
from app.services.idempotency import IdempotencyMiddleware
from app.services.policy_service import PolicyContext
from app.services.redis_client import get_redis
from conftest import TEST_AGENT_KEY, bootstrap_owner_account, login_management_account


ROOT = Path(__file__).resolve().parents[3]


def test_metrics_endpoint_exposes_prometheus_text(client) -> None:
    client.get("/healthz")
    client.get("/does-not-exist")
    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "agent_control_plane_up 1" in response.text
    assert "agent_control_plane_uptime_seconds" in response.text
    assert "agent_control_plane_http_requests_total" in response.text
    assert "agent_control_plane_http_errors_total" in response.text
    assert "agent_control_plane_management_session_logins_total" in response.text
    assert "agent_control_plane_management_session_login_failures_total" in response.text
    assert "agent_control_plane_management_session_logouts_total" in response.text
    assert "agent_control_plane_task_claims_total" in response.text
    assert "agent_control_plane_task_completions_total" in response.text
    assert "agent_control_plane_approval_requests_total" in response.text
    assert "agent_control_plane_approval_approvals_total" in response.text
    assert "agent_control_plane_capability_invocations_total" in response.text
    assert "agent_control_plane_capability_invocation_failures_total" in response.text


def test_metrics_expose_request_dimensions(client) -> None:
    client.get("/healthz")
    client.get("/does-not-exist")

    response = client.get("/metrics")

    assert response.status_code == 200
    assert 'agent_control_plane_http_requests_total{method="GET",path="/healthz",status="200"} 1' in response.text
    assert 'agent_control_plane_http_requests_total{method="GET",path="/does-not-exist",status="404"} 1' in response.text
    assert "agent_control_plane_http_errors_total 1" in response.text


def test_metrics_track_login_outcomes_task_lifecycle_and_approval_events(client, db_session) -> None:
    TaskRepository(db_session).create(TaskModel(
        id="task-observed",
        title="Observed task",
        task_type="prompt_run",
        status="pending",
    ))
    db_session.flush()

    bootstrap_owner_account(client)
    failed_login = login_management_account(client, password="wrong-password")
    successful_login = login_management_account(client)
    logout = client.post("/api/session/logout")
    claim = client.post(
        "/api/tasks/task-observed/claim",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
    )
    complete = client.post(
        "/api/tasks/task-observed/complete",
        headers={"Authorization": f"Bearer {TEST_AGENT_KEY}"},
        json={"result_summary": "done", "output_payload": {"ok": True}},
    )
    approval = require_runtime_approval(
        session=db_session,
        task_id="task-observed",
        capability_id="capability-observed",
        agent_id="test-agent",
        action_type="invoke",
        task_approval_mode="manual",
        capability_approval_mode="auto",
        context=PolicyContext(
            action_type="invoke",
            risk_level="medium",
            provider="openai",
            environment="production",
            task_type="prompt_run",
            capability_name="openai.chat.invoke",
        ),
    )
    assert approval is not None
    approve_request(
        session=db_session,
        approval_id=approval.id,
        decided_by="management",
    )

    metrics = client.get("/metrics")

    assert failed_login.status_code == 401
    assert successful_login.status_code == 200
    assert logout.status_code == 200
    assert claim.status_code == 200
    assert complete.status_code == 200
    assert "agent_control_plane_management_session_logins_total 1" in metrics.text
    assert "agent_control_plane_management_session_login_failures_total 1" in metrics.text
    assert "agent_control_plane_management_session_logouts_total 1" in metrics.text
    assert "agent_control_plane_task_claims_total 1" in metrics.text
    assert "agent_control_plane_task_completions_total 1" in metrics.text
    assert "agent_control_plane_approval_requests_total 1" in metrics.text
    assert "agent_control_plane_approval_approvals_total 1" in metrics.text


def test_metrics_endpoint_respects_runtime_settings(tmp_path) -> None:
    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'metrics.db'}",
        metrics_enabled=False,
    ))

    with TestClient(app) as client:
        response = client.get("/metrics")

    assert response.status_code == 404


def test_get_redis_uses_explicit_settings(monkeypatch) -> None:
    captured: list[str] = []

    class FakeRedis:
        pass

    def fake_from_url(url: str, decode_responses: bool):
        captured.append(url)
        return FakeRedis()

    monkeypatch.setattr("redis.from_url", fake_from_url)

    client = get_redis(Settings(redis_url="redis://example:6380/9"))

    assert isinstance(client, FakeRedis)
    assert captured == ["redis://example:6380/9"]


def test_create_app_wires_idempotency_with_runtime_redis_settings(monkeypatch, tmp_path) -> None:
    captured: list[str] = []

    def fake_get_redis(settings: Settings):
        captured.append(settings.redis_url)
        return object()

    monkeypatch.setattr("app.services.redis_client.get_redis", fake_get_redis)

    app = create_app(Settings(
        database_url=f"sqlite:///{tmp_path / 'idempotency.db'}",
        redis_url="redis://example:6380/9",
    ))

    assert captured == ["redis://example:6380/9"]
    assert any(middleware.cls is IdempotencyMiddleware for middleware in app.user_middleware)


def test_prod_compose_enables_metrics_collection() -> None:
    compose = (ROOT / "docker-compose.prod.yml").read_text()

    assert "METRICS_ENABLED: ${METRICS_ENABLED:-true}" in compose


def test_production_docs_reference_metrics_and_incident_entrypoints() -> None:
    deployment_guide = (ROOT / "docs/guides/production-deployment.md").read_text()
    operations_guide = (ROOT / "docs/guides/production-operations.md").read_text()
    quickstart = (ROOT / "docs/guides/agent-quickstart.md").read_text()

    assert "metrics" in deployment_guide.lower()
    assert "incident" in operations_guide.lower()
    assert "local development" in quickstart.lower()
    assert "x-request-id" in operations_guide.lower()
    assert "method" in operations_guide.lower()
    assert "status" in operations_guide.lower()

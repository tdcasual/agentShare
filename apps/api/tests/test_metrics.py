from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]


def test_metrics_endpoint_exposes_prometheus_text(client) -> None:
    response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "agent_control_plane_up 1" in response.text
    assert "agent_control_plane_uptime_seconds" in response.text


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

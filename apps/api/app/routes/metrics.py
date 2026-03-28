from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse

from app.config import Settings
from app.dependencies import get_settings
from app.observability import snapshot_metrics


router = APIRouter(tags=["Observability"])


@router.get(
    "/metrics",
    summary="Prometheus metrics",
    description="Minimal Prometheus-compatible metrics for production scraping.",
    response_class=PlainTextResponse,
)
def metrics(settings: Settings = Depends(get_settings)) -> PlainTextResponse:
    if not settings.metrics_enabled:
        return PlainTextResponse("", status_code=404)

    metrics_snapshot = snapshot_metrics()
    payload = "\n".join(
        [
            "# HELP agent_control_plane_up Agent Control Plane process status.",
            "# TYPE agent_control_plane_up gauge",
            f"agent_control_plane_up {metrics_snapshot['up']}",
            "# HELP agent_control_plane_uptime_seconds Agent Control Plane uptime in seconds.",
            "# TYPE agent_control_plane_uptime_seconds gauge",
            f"agent_control_plane_uptime_seconds {metrics_snapshot['uptime_seconds']:.3f}",
            "# HELP agent_control_plane_http_requests_total Total HTTP requests observed by the API.",
            "# TYPE agent_control_plane_http_requests_total counter",
            f"agent_control_plane_http_requests_total {metrics_snapshot['http_requests_total']}",
            "# HELP agent_control_plane_http_errors_total Total HTTP requests with status >= 400.",
            "# TYPE agent_control_plane_http_errors_total counter",
            f"agent_control_plane_http_errors_total {metrics_snapshot['http_errors_total']}",
            "",
        ]
    )
    return PlainTextResponse(payload)

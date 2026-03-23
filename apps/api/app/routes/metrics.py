from __future__ import annotations

from time import monotonic

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

from app.config import Settings


router = APIRouter(tags=["Observability"])
STARTED_AT = monotonic()


@router.get(
    "/metrics",
    summary="Prometheus metrics",
    description="Minimal Prometheus-compatible metrics for production scraping.",
    response_class=PlainTextResponse,
)
def metrics() -> PlainTextResponse:
    settings = Settings()
    if not settings.metrics_enabled:
        return PlainTextResponse("", status_code=404)

    uptime_seconds = monotonic() - STARTED_AT
    payload = "\n".join(
        [
            "# HELP agent_control_plane_up Agent Control Plane process status.",
            "# TYPE agent_control_plane_up gauge",
            "agent_control_plane_up 1",
            "# HELP agent_control_plane_uptime_seconds Agent Control Plane uptime in seconds.",
            "# TYPE agent_control_plane_uptime_seconds gauge",
            f"agent_control_plane_uptime_seconds {uptime_seconds:.3f}",
            "",
        ]
    )
    return PlainTextResponse(payload)

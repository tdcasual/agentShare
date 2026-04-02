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
    request_metric_lines = [
        (
            "agent_control_plane_http_requests_total"
            f'{{method="{_escape_label(sample["method"])}",path="{_escape_label(sample["path"])}",status="{_escape_label(sample["status"])}"}} '
            f'{sample["count"]}'
        )
        for sample in metrics_snapshot["http_request_dimensions"]
    ]
    payload = "\n".join(
        [
            "# HELP agent_control_plane_up Agent Control Plane process status.",
            "# TYPE agent_control_plane_up gauge",
            f"agent_control_plane_up {metrics_snapshot['up']}",
            "# HELP agent_control_plane_uptime_seconds Agent Control Plane uptime in seconds.",
            "# TYPE agent_control_plane_uptime_seconds gauge",
            f"agent_control_plane_uptime_seconds {metrics_snapshot['uptime_seconds']:.3f}",
            "# HELP agent_control_plane_http_requests_total Total HTTP requests observed by the API, partitioned by method, path, and status.",
            "# TYPE agent_control_plane_http_requests_total counter",
            *request_metric_lines,
            "# HELP agent_control_plane_http_errors_total Total HTTP requests with status >= 400.",
            "# TYPE agent_control_plane_http_errors_total counter",
            f"agent_control_plane_http_errors_total {metrics_snapshot['http_errors_total']}",
            "# HELP agent_control_plane_management_session_logins_total Successful management session logins.",
            "# TYPE agent_control_plane_management_session_logins_total counter",
            f"agent_control_plane_management_session_logins_total {metrics_snapshot['management_session_logins_total']}",
            "# HELP agent_control_plane_management_session_login_failures_total Rejected management session login attempts.",
            "# TYPE agent_control_plane_management_session_login_failures_total counter",
            f"agent_control_plane_management_session_login_failures_total {metrics_snapshot['management_session_login_failures_total']}",
            "# HELP agent_control_plane_management_session_logouts_total Successful management session logouts.",
            "# TYPE agent_control_plane_management_session_logouts_total counter",
            f"agent_control_plane_management_session_logouts_total {metrics_snapshot['management_session_logouts_total']}",
            "# HELP agent_control_plane_task_claims_total Successful task claims.",
            "# TYPE agent_control_plane_task_claims_total counter",
            f"agent_control_plane_task_claims_total {metrics_snapshot['task_claims_total']}",
            "# HELP agent_control_plane_task_completions_total Successful task completions.",
            "# TYPE agent_control_plane_task_completions_total counter",
            f"agent_control_plane_task_completions_total {metrics_snapshot['task_completions_total']}",
            "# HELP agent_control_plane_approval_requests_total Approval requests created for runtime actions.",
            "# TYPE agent_control_plane_approval_requests_total counter",
            f"agent_control_plane_approval_requests_total {metrics_snapshot['approval_requests_total']}",
            "# HELP agent_control_plane_approval_approvals_total Approval requests approved by operators.",
            "# TYPE agent_control_plane_approval_approvals_total counter",
            f"agent_control_plane_approval_approvals_total {metrics_snapshot['approval_approvals_total']}",
            "# HELP agent_control_plane_approval_rejections_total Approval requests rejected by operators.",
            "# TYPE agent_control_plane_approval_rejections_total counter",
            f"agent_control_plane_approval_rejections_total {metrics_snapshot['approval_rejections_total']}",
            "# HELP agent_control_plane_capability_invocations_total Successful capability proxy invokes.",
            "# TYPE agent_control_plane_capability_invocations_total counter",
            f"agent_control_plane_capability_invocations_total {metrics_snapshot['capability_invocations_total']}",
            "# HELP agent_control_plane_capability_invocation_failures_total Failed capability proxy invokes.",
            "# TYPE agent_control_plane_capability_invocation_failures_total counter",
            f"agent_control_plane_capability_invocation_failures_total {metrics_snapshot['capability_invocation_failures_total']}",
            "",
        ]
    )
    return PlainTextResponse(payload)


def _escape_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

from __future__ import annotations

from threading import Lock
from time import monotonic
from typing import TypedDict


class HttpRequestMetric(TypedDict):
    method: str
    path: str
    status: str
    count: int


class RequestLogEvent(TypedDict):
    event: str
    request_id: str
    method: str
    path: str
    status: int
    duration_ms: float


STARTED_AT = monotonic()
_lock = Lock()
_http_requests_total = 0
_http_errors_total = 0
_http_request_dimensions: dict[tuple[str, str, str], int] = {}
_counters = {
    "management_session_logins_total": 0,
    "management_session_login_failures_total": 0,
    "task_claims_total": 0,
    "task_completions_total": 0,
    "approval_requests_total": 0,
    "approval_approvals_total": 0,
    "approval_rejections_total": 0,
    "capability_invocations_total": 0,
    "capability_invocation_failures_total": 0,
}


def _increment_counter(counter_key: str) -> None:
    with _lock:
        _counters[counter_key] += 1


def record_http_request(method: str, path: str, status_code: int) -> None:
    global _http_requests_total, _http_errors_total

    dimension_key = (method.upper(), path, str(status_code))
    with _lock:
        _http_requests_total += 1
        _http_request_dimensions[dimension_key] = _http_request_dimensions.get(dimension_key, 0) + 1
        if status_code >= 400:
            _http_errors_total += 1


def build_request_log_event(
    *,
    request_id: str,
    method: str,
    path: str,
    status: int,
    duration_ms: float,
) -> RequestLogEvent:
    return {
        "event": "http_request",
        "request_id": request_id,
        "method": method,
        "path": path,
        "status": status,
        "duration_ms": duration_ms,
    }


def record_management_session_login(success: bool) -> None:
    _increment_counter("management_session_logins_total" if success else "management_session_login_failures_total")


def record_task_claim() -> None:
    _increment_counter("task_claims_total")


def record_task_completion() -> None:
    _increment_counter("task_completions_total")


def record_approval_requested() -> None:
    _increment_counter("approval_requests_total")


def record_approval_decision(approved: bool) -> None:
    _increment_counter("approval_approvals_total" if approved else "approval_rejections_total")


def record_capability_invoke(success: bool) -> None:
    _increment_counter("capability_invocations_total" if success else "capability_invocation_failures_total")


def reset_metrics() -> None:
    global _http_requests_total, _http_errors_total

    with _lock:
        _http_requests_total = 0
        _http_errors_total = 0
        _http_request_dimensions.clear()
        for key in _counters:
            _counters[key] = 0


def snapshot_metrics() -> dict[str, float | int | list[HttpRequestMetric]]:
    with _lock:
        snapshot = {
            "up": 1,
            "uptime_seconds": monotonic() - STARTED_AT,
            "http_requests_total": _http_requests_total,
            "http_errors_total": _http_errors_total,
            "http_request_dimensions": [
                {
                    "method": method,
                    "path": path,
                    "status": status,
                    "count": count,
                }
                for (method, path, status), count in sorted(_http_request_dimensions.items())
            ],
        }
        snapshot.update(_counters)
        return snapshot

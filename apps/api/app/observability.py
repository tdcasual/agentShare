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


def reset_metrics() -> None:
    global _http_requests_total, _http_errors_total

    with _lock:
        _http_requests_total = 0
        _http_errors_total = 0
        _http_request_dimensions.clear()


def snapshot_metrics() -> dict[str, float | int | list[HttpRequestMetric]]:
    with _lock:
        return {
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

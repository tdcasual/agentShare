from __future__ import annotations

from threading import Lock
from time import monotonic


STARTED_AT = monotonic()
_lock = Lock()
_http_requests_total = 0
_http_errors_total = 0


def record_http_request(status_code: int) -> None:
    global _http_requests_total, _http_errors_total

    with _lock:
        _http_requests_total += 1
        if status_code >= 400:
            _http_errors_total += 1


def snapshot_metrics() -> dict[str, float | int]:
    with _lock:
        return {
            "up": 1,
            "uptime_seconds": monotonic() - STARTED_AT,
            "http_requests_total": _http_requests_total,
            "http_errors_total": _http_errors_total,
        }

from __future__ import annotations

from typing import TypedDict


class RequestLogEvent(TypedDict):
    event: str
    request_id: str
    method: str
    path: str
    status: int
    duration_ms: float


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

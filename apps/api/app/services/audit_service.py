from __future__ import annotations

from typing import Any

from app.store import store


def write_audit_event(event_type: str, payload: dict[str, Any]) -> dict[str, Any]:
    event = {"event_type": event_type, "payload": payload}
    store.audit_events.append(event)
    return event

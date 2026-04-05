import json
import logging

from fastapi import APIRouter
from fastapi.testclient import TestClient

from app.config import Settings
from app import factory as factory_module
from app.factory import create_app


def test_request_logging_emits_structured_record(client, caplog) -> None:
    caplog.set_level(logging.INFO, logger="app.request")

    response = client.get("/healthz")

    assert response.status_code == 200

    matching_records = [
        record for record in caplog.records if record.name == "app.request"
    ]
    assert matching_records

    payload = json.loads(matching_records[-1].message)
    assert payload["event"] == "http_request"
    assert payload["request_id"]
    assert payload["method"] == "GET"
    assert payload["path"] == "/healthz"
    assert payload["status"] == 200
    assert payload["duration_ms"] >= 0
    assert response.headers["x-request-id"] == payload["request_id"]


def test_request_logging_preserves_supplied_request_id(client, caplog) -> None:
    caplog.set_level(logging.INFO, logger="app.request")

    response = client.get("/healthz", headers={"x-request-id": "req-observed-123"})

    assert response.status_code == 200

    matching_records = [
        record for record in caplog.records if record.name == "app.request"
    ]
    assert matching_records

    payload = json.loads(matching_records[-1].message)
    assert payload["request_id"] == "req-observed-123"
    assert payload["method"] == "GET"
    assert payload["path"] == "/healthz"
    assert payload["status"] == 200
    assert response.headers["x-request-id"] == "req-observed-123"


def test_request_logging_tracks_unhandled_exceptions_with_request_id(monkeypatch, tmp_path) -> None:
    captured_messages: list[str] = []

    def capture_info(message: str, *args, **kwargs) -> None:
        del args
        del kwargs
        captured_messages.append(message)

    router = APIRouter()

    @router.get("/boom")
    def boom() -> dict[str, str]:
        raise RuntimeError("unexpected failure")

    monkeypatch.setattr(factory_module.request_logger, "info", capture_info)
    monkeypatch.setattr(factory_module.request_logger, "exception", lambda *args, **kwargs: None)

    app = create_app(Settings(database_url=f"sqlite:///{tmp_path / 'request-logging.db'}"))
    app.include_router(router)

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/boom", headers={"x-request-id": "req-crash-123"})

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal Server Error"}
    assert response.headers["x-request-id"] == "req-crash-123"

    payloads = [json.loads(message) for message in captured_messages]
    matching_payloads = [payload for payload in payloads if payload.get("status") == 500]
    assert matching_payloads

    payload = matching_payloads[-1]
    assert payload["request_id"] == "req-crash-123"
    assert payload["path"] == "/boom"
    assert payload["status"] == 500

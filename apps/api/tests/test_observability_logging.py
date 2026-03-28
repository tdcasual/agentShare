import json
import logging


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
    assert payload["status_code"] == 200
    assert payload["duration_ms"] >= 0
    assert response.headers["x-request-id"] == payload["request_id"]

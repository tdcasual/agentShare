import json

import fakeredis
import pytest
from fastapi import FastAPI
from fastapi import Request
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse
from starlette.responses import PlainTextResponse

from app.services.idempotency import IdempotencyMiddleware


@pytest.fixture
def fake_redis_client():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture
def idempotent_app(fake_redis_client):
    test_app = FastAPI()
    test_app.add_middleware(IdempotencyMiddleware, redis_client=fake_redis_client, ttl_seconds=300)
    state = {
        "test": 0,
        "one": 0,
        "two": 0,
        "echo": 0,
        "text": 0,
        "created": 0,
        "header_json": 0,
        "cookie_json": 0,
    }

    @test_app.post("/test")
    def test_endpoint():
        state["test"] += 1
        return {"result": "ok", "call_count": state["test"]}

    @test_app.post("/one")
    def one_endpoint():
        state["one"] += 1
        return {"path": "/one", "call_count": state["one"]}

    @test_app.post("/two")
    def two_endpoint():
        state["two"] += 1
        return {"path": "/two", "call_count": state["two"]}

    @test_app.post("/echo")
    async def echo_endpoint(request: Request):
        state["echo"] += 1
        payload = await request.json()
        return {"payload": payload, "call_count": state["echo"]}

    @test_app.post("/text")
    def text_endpoint():
        state["text"] += 1
        return PlainTextResponse(f"plain-{state['text']}")

    @test_app.post("/created")
    def created_endpoint():
        state["created"] += 1
        return JSONResponse(
            content={"result": "created", "call_count": state["created"]},
            status_code=201,
        )

    @test_app.post("/header-json")
    def header_json_endpoint():
        state["header_json"] += 1
        return JSONResponse(
            content={"result": "header", "call_count": state["header_json"]},
            status_code=202,
            headers={
                "Location": "/jobs/job-123",
                "ETag": '"etag-v1"',
                "Cache-Control": "private, max-age=60",
                "X-Correlation-Id": "corr-123",
            },
        )

    @test_app.post("/cookie-json")
    def cookie_json_endpoint():
        state["cookie_json"] += 1
        response = JSONResponse(
            content={"result": "cookie", "call_count": state["cookie_json"]},
            status_code=200,
        )
        response.set_cookie("session_token", f"token-{state['cookie_json']}", httponly=True)
        return response

    return TestClient(test_app)


def test_no_idempotency_key_passes_through(idempotent_app):
    resp = idempotent_app.post("/test")
    assert resp.status_code == 200


def test_same_key_returns_cached_response(idempotent_app):
    headers = {"Idempotency-Key": "key-abc"}
    resp1 = idempotent_app.post("/test", headers=headers)
    resp2 = idempotent_app.post("/test", headers=headers)
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert resp1.json() == resp2.json()


def test_different_keys_are_independent(idempotent_app):
    resp1 = idempotent_app.post("/test", headers={"Idempotency-Key": "key-1"})
    resp2 = idempotent_app.post("/test", headers={"Idempotency-Key": "key-2"})
    assert resp1.status_code == 200
    assert resp2.status_code == 200


def test_same_idempotency_key_does_not_cross_route_boundaries(idempotent_app):
    headers = {"Idempotency-Key": "cross-route-key"}

    one = idempotent_app.post("/one", headers=headers)
    two = idempotent_app.post("/two", headers=headers)

    assert one.status_code == 200
    assert two.status_code == 200
    assert one.json()["path"] == "/one"
    assert two.json()["path"] == "/two"


def test_same_idempotency_key_does_not_replay_when_body_changes(idempotent_app):
    headers = {"Idempotency-Key": "body-sensitive-key"}

    first = idempotent_app.post("/echo", headers=headers, json={"value": 1})
    second = idempotent_app.post("/echo", headers=headers, json={"value": 2})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["payload"] == {"value": 1}
    assert second.json()["payload"] == {"value": 2}
    assert second.json()["call_count"] == 2


def test_non_json_responses_are_not_cached_for_idempotency(idempotent_app):
    headers = {"Idempotency-Key": "text-response-key"}

    first = idempotent_app.post("/text", headers=headers)
    second = idempotent_app.post("/text", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.headers["content-type"].startswith("text/plain")
    assert second.headers["content-type"].startswith("text/plain")
    assert first.text == "plain-1"
    assert second.text == "plain-2"


def test_cached_json_replay_preserves_status_code(idempotent_app):
    headers = {"Idempotency-Key": "created-status-key"}

    first = idempotent_app.post("/created", headers=headers)
    second = idempotent_app.post("/created", headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json() == {"result": "created", "call_count": 1}
    assert second.json() == {"result": "created", "call_count": 1}


def test_cached_json_replay_preserves_relevant_response_headers(idempotent_app):
    headers = {"Idempotency-Key": "header-replay-key"}

    first = idempotent_app.post("/header-json", headers=headers)
    second = idempotent_app.post("/header-json", headers=headers)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json() == {"result": "header", "call_count": 1}
    assert second.json() == {"result": "header", "call_count": 1}
    assert second.headers["location"] == "/jobs/job-123"
    assert second.headers["etag"] == '"etag-v1"'
    assert second.headers["cache-control"] == "private, max-age=60"
    assert second.headers["x-correlation-id"] == "corr-123"


def test_json_responses_with_set_cookie_are_not_cached(idempotent_app):
    headers = {"Idempotency-Key": "cookie-json-key"}

    first = idempotent_app.post("/cookie-json", headers=headers)
    second = idempotent_app.post("/cookie-json", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == {"result": "cookie", "call_count": 1}
    assert second.json() == {"result": "cookie", "call_count": 2}
    assert first.headers.get("set-cookie")
    assert second.headers.get("set-cookie")

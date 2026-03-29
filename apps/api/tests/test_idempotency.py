import json

import fakeredis
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse, PlainTextResponse

from app.services.idempotency import IdempotencyMiddleware


@pytest.fixture
def fake_redis_client():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture
def idempotent_app(fake_redis_client):
    test_app = FastAPI()
    test_app.add_middleware(IdempotencyMiddleware, redis_client=fake_redis_client, ttl_seconds=300)
    counters = {
        "one": 0,
        "two": 0,
        "echo": 0,
        "created": 0,
        "plain": 0,
    }

    @test_app.post("/test")
    def test_endpoint():
        return {"result": "ok", "call_count": 1}

    @test_app.post("/one")
    def one_endpoint():
        counters["one"] += 1
        return {"endpoint": "one", "count": counters["one"]}

    @test_app.post("/two")
    def two_endpoint():
        counters["two"] += 1
        return {"endpoint": "two", "count": counters["two"]}

    @test_app.post("/echo")
    def echo_endpoint(payload: dict):
        counters["echo"] += 1
        return {"payload": payload, "count": counters["echo"]}

    @test_app.post("/created")
    def created_endpoint():
        counters["created"] += 1
        return JSONResponse(
            status_code=201,
            content={"status": "created", "count": counters["created"]},
        )

    @test_app.post("/plain")
    def plain_endpoint():
        counters["plain"] += 1
        return PlainTextResponse(f"plain-{counters['plain']}")

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


def test_idempotency_cache_key_includes_request_path(idempotent_app):
    headers = {"Idempotency-Key": "same"}
    first = idempotent_app.post("/one", headers=headers)
    second = idempotent_app.post("/two", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["endpoint"] == "one"
    assert second.json()["endpoint"] == "two"
    assert first.json() != second.json()


def test_idempotency_cache_key_includes_request_body(idempotent_app):
    headers = {"Idempotency-Key": "same"}
    first = idempotent_app.post("/echo", headers=headers, json={"value": 1})
    second = idempotent_app.post("/echo", headers=headers, json={"value": 2})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["payload"] == {"value": 1}
    assert second.json()["payload"] == {"value": 2}
    assert first.json() != second.json()


def test_cached_json_responses_preserve_status_code(idempotent_app):
    headers = {"Idempotency-Key": "created-key"}
    first = idempotent_app.post("/created", headers=headers)
    second = idempotent_app.post("/created", headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json() == second.json()


def test_non_json_responses_are_not_cached(idempotent_app):
    headers = {"Idempotency-Key": "plain-key"}
    first = idempotent_app.post("/plain", headers=headers)
    second = idempotent_app.post("/plain", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.text == "plain-1"
    assert second.text == "plain-2"

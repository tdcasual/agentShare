import json

import fakeredis
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse

from app.services.idempotency import IdempotencyMiddleware


@pytest.fixture
def fake_redis_client():
    return fakeredis.FakeRedis(decode_responses=True)


@pytest.fixture
def idempotent_app(fake_redis_client):
    test_app = FastAPI()
    test_app.add_middleware(IdempotencyMiddleware, redis_client=fake_redis_client, ttl_seconds=300)

    @test_app.post("/test")
    def test_endpoint():
        return {"result": "ok", "call_count": 1}

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

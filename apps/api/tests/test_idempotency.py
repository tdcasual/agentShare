from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.idempotency import _decode_response, commit_idempotent_response, replay_idempotent_response
from app.orm import User
from app.runtime import build_runtime
from app.services.encryption import get_encryption_service, reset_encryption_service


def _request(key: str, path: str = "/api/admin/secrets") -> Request:
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": path,
            "headers": [(b"idempotency-key", key.encode())],
            "client": ("127.0.0.1", 1234),
        }
    )


def test_idempotency_replays_encrypted_response_and_rejects_mismatch(test_settings) -> None:
    async def exercise() -> None:
        reset_encryption_service()
        runtime = build_runtime(test_settings)
        try:
            async with runtime.session_factory() as db:
                user = User(email="admin@example.com", password_hash="hash")
                db.add(user)
                await db.flush()
                context, replay = await replay_idempotent_response(
                    db, _request("request-123"), user.id, {"name": "database"}
                )
                assert replay is None
                payload = {"id": "secret-id", "name": "database"}
                assert await commit_idempotent_response(
                    db, user.id, context, payload, status_code=201
                ) is None

                replay_context, replay = await replay_idempotent_response(
                    db, _request("request-123"), user.id, {"name": "database"}
                )
                assert replay_context is not None
                assert replay == payload

                with pytest.raises(HTTPException) as raised:
                    await replay_idempotent_response(
                        db, _request("request-123"), user.id, {"name": "different"}
                    )
                assert raised.value.status_code == 409
        finally:
            await runtime.dispose()
            reset_encryption_service()

    asyncio.run(exercise())


def test_idempotency_rejects_non_object_stored_response(test_settings) -> None:
    reset_encryption_service()
    try:
        service = get_encryption_service(
            test_settings.encryption_key,
            test_settings.encryption_keyring,
            test_settings.encryption_active_key_id,
        )
        with pytest.raises(ValueError, match="must be a JSON object"):
            _decode_response(service.encrypt("[]"))
    finally:
        reset_encryption_service()

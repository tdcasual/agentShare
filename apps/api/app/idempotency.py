from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any, cast

from fastapi import HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.orm import IdempotencyRecord
from app.services.encryption import get_encryption_service


@dataclass(frozen=True)
class IdempotencyContext:
    key: str
    request_hash: str
    principal_type: str
    principal_id: str


def _decode_response(encrypted_payload: str) -> dict[str, Any]:
    decoded: object = json.loads(get_encryption_service().decrypt(encrypted_payload))
    if not isinstance(decoded, dict):
        raise ValueError("Stored idempotency response must be a JSON object")
    return cast(dict[str, Any], decoded)


def _request_hash(request: Request, payload: Any) -> str:
    canonical = json.dumps(
        {
            "method": request.method,
            "path": request.url.path,
            "payload": payload,
        },
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


async def replay_idempotent_response(
    db: AsyncSession,
    request: Request,
    user_id: str,
    payload: Any,
    *,
    principal_type: str = "admin",
    principal_id: str | None = None,
) -> tuple[IdempotencyContext | None, dict[str, Any] | None]:
    raw_key = request.headers.get("idempotency-key")
    if raw_key is None:
        return None, None
    key = raw_key.strip()
    if not 8 <= len(key) <= 255:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Idempotency-Key must contain 8 to 255 characters",
        )
    resolved_principal_id = principal_id or user_id
    context = IdempotencyContext(
        key=key,
        request_hash=_request_hash(request, payload),
        principal_type=principal_type,
        principal_id=resolved_principal_id,
    )
    record = await db.scalar(
        select(IdempotencyRecord).where(
            IdempotencyRecord.user_id == user_id,
            IdempotencyRecord.principal_type == context.principal_type,
            IdempotencyRecord.principal_id == context.principal_id,
            IdempotencyRecord.key == key,
        )
    )
    if record is None:
        return context, None
    if record.request_hash != context.request_hash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Idempotency-Key was already used for a different request",
        )
    return context, _decode_response(record.response_encrypted)


def store_idempotent_response(
    db: AsyncSession,
    user_id: str,
    context: IdempotencyContext | None,
    payload: dict[str, Any],
    *,
    status_code: int,
) -> None:
    if context is None:
        return
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    db.add(
        IdempotencyRecord(
            user_id=user_id,
            principal_type=context.principal_type,
            principal_id=context.principal_id,
            key=context.key,
            request_hash=context.request_hash,
            status_code=status_code,
            response_encrypted=get_encryption_service().encrypt(encoded),
        )
    )


async def commit_idempotent_response(
    db: AsyncSession,
    user_id: str,
    context: IdempotencyContext | None,
    payload: dict[str, Any],
    *,
    status_code: int,
) -> dict[str, Any] | None:
    store_idempotent_response(db, user_id, context, payload, status_code=status_code)
    try:
        await db.commit()
        return None
    except IntegrityError:
        await db.rollback()
        if context is None:
            raise
        record = await db.scalar(
            select(IdempotencyRecord).where(
                IdempotencyRecord.user_id == user_id,
                IdempotencyRecord.principal_type == context.principal_type,
                IdempotencyRecord.principal_id == context.principal_id,
                IdempotencyRecord.key == context.key,
            )
        )
        if record is None:
            raise
        if record.request_hash != context.request_hash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Idempotency-Key was already used for a different request",
            ) from None
        return _decode_response(record.response_encrypted)

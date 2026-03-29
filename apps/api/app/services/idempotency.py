from __future__ import annotations

import hashlib
import json
from typing import Any

import redis
from starlette.concurrency import iterate_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class IdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: Any, redis_client: redis.Redis, ttl_seconds: int = 300) -> None:
        super().__init__(app)
        self.redis = redis_client
        self.ttl = ttl_seconds

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        idem_key = request.headers.get("Idempotency-Key")
        if not idem_key:
            return await call_next(request)

        request_body = await request.body()
        cache_key = _build_cache_key(request, idem_key, request_body)

        cached = self.redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return JSONResponse(
                content=data["body"],
                status_code=data["status_code"],
                media_type=data["media_type"],
                headers=data.get("headers") or None,
            )

        response = await call_next(request)

        # Read the response body so we can decide whether it is safe to replay.
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk if isinstance(chunk, bytes) else chunk.encode()

        media_type = _extract_media_type(response)
        replayable_body = _decode_replayable_json(body_bytes, media_type)
        _restore_response_body(response, body_bytes)
        if replayable_body is None or _has_non_replayable_headers(response):
            return response

        self.redis.setex(
            cache_key,
            self.ttl,
            json.dumps(
                {
                    "status_code": response.status_code,
                    "media_type": media_type,
                    "body": replayable_body,
                    "headers": _build_replayable_headers(response),
                },
                sort_keys=True,
                separators=(",", ":"),
            ),
        )
        return response


def _build_cache_key(request: Request, idem_key: str, body_bytes: bytes) -> str:
    stable_body = _stable_body_bytes(request, body_bytes)
    body_hash = hashlib.sha256(stable_body).hexdigest()
    return f"idempotency:{idem_key}:{request.method.upper()}:{request.url.path}:{body_hash}"


def _stable_body_bytes(request: Request, body_bytes: bytes) -> bytes:
    if not body_bytes:
        return b""
    if not _is_json_media_type(request.headers.get("content-type", "")):
        return body_bytes
    try:
        parsed = json.loads(body_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return body_bytes
    return json.dumps(
        parsed,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")


def _extract_media_type(response: Response) -> str:
    content_type = response.headers.get("content-type", "").split(";", 1)[0].strip()
    if content_type:
        return content_type
    return response.media_type or "application/octet-stream"


def _decode_replayable_json(body_bytes: bytes, media_type: str) -> Any | None:
    if not _is_json_media_type(media_type):
        return None
    try:
        return json.loads(body_bytes)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _is_json_media_type(content_type: str) -> bool:
    base = content_type.split(";", 1)[0].strip().lower()
    return base == "application/json" or base.endswith("+json")
def _restore_response_body(response: Response, body_bytes: bytes) -> None:
    response.body_iterator = iterate_in_threadpool(iter((body_bytes,)))


def _has_non_replayable_headers(response: Response) -> bool:
    return any(key.lower() == b"set-cookie" for key, _ in response.raw_headers)


def _build_replayable_headers(response: Response) -> dict[str, str]:
    blocked = {
        "set-cookie",
        "content-length",
        "content-type",
        "transfer-encoding",
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailer",
        "upgrade",
    }
    return {
        key: value
        for key, value in response.headers.items()
        if key.lower() not in blocked
    }

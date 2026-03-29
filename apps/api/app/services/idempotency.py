from __future__ import annotations

import hashlib
import json
from typing import Any

import redis
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class IdempotencyMiddleware(BaseHTTPMiddleware):
    _MAX_CACHEABLE_RESPONSE_BYTES = 64 * 1024

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

        request_fingerprint = await self._build_request_fingerprint(request)
        cache_key = f"idempotency:{idem_key}:{request_fingerprint}"

        cached = self.redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return JSONResponse(
                content=data["body"],
                status_code=data["status_code"],
                media_type=data.get("media_type", "application/json"),
            )

        response = await call_next(request)

        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk if isinstance(chunk, bytes) else chunk.encode()

        cache_envelope = self._build_cache_envelope(response, body_bytes)
        if cache_envelope is not None:
            self.redis.setex(cache_key, self.ttl, json.dumps(cache_envelope))

        return Response(
            content=body_bytes,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type,
        )

    async def _build_request_fingerprint(self, request: Request) -> str:
        body_bytes = await request.body()
        try:
            parsed = json.loads(body_bytes)
            stable_body = json.dumps(parsed, sort_keys=True, separators=(",", ":")).encode("utf-8")
        except (json.JSONDecodeError, UnicodeDecodeError):
            stable_body = body_bytes
        body_hash = hashlib.sha256(stable_body).hexdigest()
        raw_fingerprint = f"{request.method}:{request.url.path}:{body_hash}"
        return hashlib.sha256(raw_fingerprint.encode("utf-8")).hexdigest()

    def _build_cache_envelope(self, response: Response, body_bytes: bytes) -> dict[str, Any] | None:
        content_type = (response.headers.get("content-type") or "").lower()
        if not content_type.startswith("application/json"):
            return None
        if len(body_bytes) > self._MAX_CACHEABLE_RESPONSE_BYTES:
            return None

        try:
            body_json = json.loads(body_bytes)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

        return {
            "status_code": response.status_code,
            "media_type": response.media_type or "application/json",
            "body": body_json,
        }

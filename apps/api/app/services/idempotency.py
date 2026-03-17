from __future__ import annotations

import json
from typing import Any

import redis
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

        cache_key = f"idempotency:{idem_key}"

        cached = self.redis.get(cache_key)
        if cached:
            data = json.loads(cached)
            return JSONResponse(content=data["body"], status_code=data["status_code"])

        response = await call_next(request)

        # Read and cache the response body
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk if isinstance(chunk, bytes) else chunk.encode()

        try:
            body_json = json.loads(body_bytes)
        except (json.JSONDecodeError, UnicodeDecodeError):
            body_json = body_bytes.decode("utf-8", errors="replace")

        self.redis.setex(
            cache_key,
            self.ttl,
            json.dumps({"status_code": response.status_code, "body": body_json}),
        )

        return JSONResponse(content=body_json, status_code=response.status_code)

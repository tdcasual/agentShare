from __future__ import annotations

import asyncio
import hashlib
import json
import logging
from typing import Any
from uuid import uuid4

import redis
from starlette.concurrency import iterate_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)


class IdempotencyMiddleware(BaseHTTPMiddleware):
    _MAX_CACHEABLE_RESPONSE_BYTES = 64 * 1024
    _LOCK_POLL_INTERVAL_SECONDS = 0.01
    _REPLAY_SAFE_HEADERS = {
        "content-type",
        "content-length",
    }

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
        lock_key = f"{cache_key}:lock"
        lock_token = uuid4().hex

        try:
            while True:
                cached = self._load_cached_response(cache_key)
                if cached is not None:
                    return cached

                if self._try_acquire_lock(lock_key, lock_token):
                    break

                await asyncio.sleep(self._LOCK_POLL_INTERVAL_SECONDS)
        except redis.RedisError:
            logger.warning("Idempotency middleware bypassed because Redis failed at request time", exc_info=True)
            return await call_next(request)

        try:
            response = await call_next(request)
            if not self._is_explicitly_cacheable_response(response):
                return response
            if self._response_content_length(response) > self._MAX_CACHEABLE_RESPONSE_BYTES:
                return response

            body_bytes = await self._read_response_body(response)
            cache_envelope = self._build_cache_envelope(response, body_bytes)
            if cache_envelope is not None:
                try:
                    self.redis.setex(cache_key, self.ttl, json.dumps(cache_envelope))
                except redis.RedisError:
                    logger.warning("Idempotency middleware failed to persist a cached response", exc_info=True)

            self._restore_response_body(response, body_bytes)
            return response
        finally:
            try:
                self._release_lock(lock_key, lock_token)
            except redis.RedisError:
                logger.warning("Idempotency middleware failed to release a request lock", exc_info=True)

    async def _build_request_fingerprint(self, request: Request) -> str:
        body_bytes = await request.body()
        try:
            parsed = json.loads(body_bytes)
            stable_body = json.dumps(parsed, sort_keys=True, separators=(",", ":")).encode("utf-8")
        except (json.JSONDecodeError, UnicodeDecodeError):
            stable_body = body_bytes
        body_hash = hashlib.sha256(stable_body).hexdigest()
        auth_context_hash = self._build_auth_context_hash(request)
        raw_fingerprint = f"{request.method}:{request.url.path}:{body_hash}:{auth_context_hash}"
        return hashlib.sha256(raw_fingerprint.encode("utf-8")).hexdigest()

    def _build_auth_context_hash(self, request: Request) -> str:
        auth_context = {
            "authorization": request.headers.get("authorization", ""),
            "cookies": sorted(request.cookies.items()),
        }
        normalized_context = json.dumps(auth_context, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(normalized_context.encode("utf-8")).hexdigest()

    def _load_cached_response(self, cache_key: str) -> JSONResponse | None:
        cached = self.redis.get(cache_key)
        if not cached:
            return None

        data = json.loads(cached)
        return JSONResponse(
            content=data["body"],
            status_code=data["status_code"],
            media_type=data.get("media_type", "application/json"),
        )

    def _try_acquire_lock(self, lock_key: str, lock_token: str) -> bool:
        return bool(self.redis.set(lock_key, lock_token, nx=True, ex=self.ttl))

    def _release_lock(self, lock_key: str, lock_token: str) -> None:
        self.redis.eval(
            """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            end
            return 0
            """,
            1,
            lock_key,
            lock_token,
        )

    def _build_cache_envelope(self, response: Response, body_bytes: bytes) -> dict[str, Any] | None:
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

    def _is_explicitly_cacheable_response(self, response: Response) -> bool:
        if not 200 <= response.status_code < 300:
            return False
        content_type = (response.headers.get("content-type") or "").lower()
        if not content_type.startswith("application/json"):
            return False
        if response.headers.get("content-length") is None:
            return False

        header_names = {key.lower() for key in response.headers.keys()}
        if not header_names.issubset(self._REPLAY_SAFE_HEADERS):
            return False

        return True

    def _response_content_length(self, response: Response) -> int:
        raw_value = response.headers.get("content-length")
        if raw_value is None:
            return 0
        try:
            return int(raw_value)
        except ValueError:
            return 0

    async def _read_response_body(self, response: Response) -> bytes:
        body_bytes = b""
        async for chunk in response.body_iterator:
            body_bytes += chunk if isinstance(chunk, bytes) else chunk.encode()
        return body_bytes

    def _restore_response_body(self, response: Response, body_bytes: bytes) -> None:
        response.body_iterator = iterate_in_threadpool([body_bytes])

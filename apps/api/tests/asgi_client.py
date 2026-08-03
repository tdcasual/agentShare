from __future__ import annotations

import asyncio
from types import TracebackType
from typing import Any, Self

import httpx
from fastapi import FastAPI


class TestClient:
    """Synchronous test facade backed by HTTPX's native ASGI transport."""

    __test__ = False

    def __init__(
        self,
        app: FastAPI,
        *,
        base_url: str = "http://testserver",
        headers: dict[str, str] | None = None,
        cookies: httpx._types.CookieTypes | None = None,
        raise_server_exceptions: bool = True,
        use_lifespan: bool = False,
    ) -> None:
        self.app = app
        self._loop = asyncio.new_event_loop()
        self._client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app, raise_app_exceptions=raise_server_exceptions),
            base_url=base_url,
            headers=headers,
            cookies=cookies,
            follow_redirects=True,
        )
        self._lifespan: Any = None
        self._use_lifespan = use_lifespan
        self._closed = False

    @property
    def headers(self) -> httpx.Headers:
        return self._client.headers

    @property
    def cookies(self) -> httpx.Cookies:
        return self._client.cookies

    def request(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        return self._loop.run_until_complete(self._client.request(method, url, **kwargs))

    def get(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("PUT", url, **kwargs)

    def patch(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("PATCH", url, **kwargs)

    def delete(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("DELETE", url, **kwargs)

    def options(self, url: str, **kwargs: Any) -> httpx.Response:
        return self.request("OPTIONS", url, **kwargs)

    def __enter__(self) -> Self:
        if self._use_lifespan:
            self._lifespan = self.app.router.lifespan_context(self.app)
            self._loop.run_until_complete(self._lifespan.__aenter__())
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        if self._lifespan is not None:
            self._loop.run_until_complete(self._lifespan.__aexit__(exc_type, exc_value, traceback))
        self.close()

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        self._loop.run_until_complete(self._client.aclose())
        self._loop.close()

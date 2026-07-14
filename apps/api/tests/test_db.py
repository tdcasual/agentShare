import asyncio

from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.config import Settings
from app.db import get_async_db
from app.factory import create_app
from app.runtime import _async_database_url, build_runtime


def test_postgres_async_url_preserves_encoded_password() -> None:
    converted = _async_database_url("postgresql://vault:p%40ss@postgres:5432/vaultgate")

    parsed = make_url(converted)
    assert parsed.drivername == "postgresql+asyncpg"
    assert parsed.password == "p@ss"


def test_runtime_owns_one_async_engine_and_session_factory() -> None:
    async def exercise_runtime() -> None:
        runtime = build_runtime(Settings(database_url="sqlite:///:memory:"))
        try:
            assert isinstance(runtime.engine, AsyncEngine)
            assert runtime.session_factory.kw["bind"] is runtime.engine

            async with runtime.session_factory() as session:
                result = await session.execute(text("SELECT 1"))
                assert result.scalar() == 1
        finally:
            await runtime.dispose()

    asyncio.run(exercise_runtime())


def test_request_database_dependency_uses_attached_runtime(tmp_path) -> None:
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'attached-runtime.db'}")
    runtime = build_runtime(settings)
    app = create_app(
        settings,
        runtime=runtime,
        app_configurers=(),
        route_registrar=None,
    )

    @app.get("/runtime-engine")
    async def runtime_engine(db: AsyncSession = Depends(get_async_db)) -> dict[str, bool]:
        return {"uses_attached_engine": db.bind is runtime.engine}

    with TestClient(app) as client:
        response = client.get("/runtime-engine")

    assert response.status_code == 200
    assert response.json() == {"uses_attached_engine": True}


def test_runtime_engine_uses_configured_async_url(tmp_path) -> None:
    async def inspect_runtime() -> None:
        runtime = build_runtime(Settings(database_url=f"sqlite:///{tmp_path / 'runtime-test.db'}"))
        try:
            assert str(runtime.engine.url).startswith("sqlite+aiosqlite:///")
            assert str(runtime.engine.url).endswith("runtime-test.db")
        finally:
            await runtime.dispose()

    asyncio.run(inspect_runtime())

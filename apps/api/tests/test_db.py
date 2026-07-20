import asyncio

from alembic.config import Config
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy import make_url, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

import app.db as db_module
from app.config import Settings
from app.db import POSTGRES_MIGRATION_LOCK_ID, _build_alembic_config, get_async_db, migrate_db
from app.factory import create_app
from app.runtime import _async_database_url, build_runtime


def test_postgres_async_url_preserves_encoded_password() -> None:
    converted = _async_database_url("postgresql://vault:p%40ss@postgres:5432/vaultgate")

    parsed = make_url(converted)
    assert parsed.drivername == "postgresql+asyncpg"
    assert parsed.password == "p@ss"


def test_alembic_config_preserves_percent_encoded_password() -> None:
    database_url = "postgresql://vault:p%40ss%25word@postgres:5432/vaultgate"

    assert _build_alembic_config(database_url).get_main_option("sqlalchemy.url") == database_url


def test_postgres_migration_lock_id_fits_signed_bigint() -> None:
    assert 0 < POSTGRES_MIGRATION_LOCK_ID < 2**63


def test_postgres_migration_upgrade_waits_for_and_releases_advisory_lock(monkeypatch) -> None:
    class FakeResult:
        def __init__(self, value: bool) -> None:
            self.value = value

        def scalar_one(self) -> bool:
            return self.value

    class FakeConnection:
        def __init__(self) -> None:
            self.lock_attempts = iter((False, True))
            self.commits = 0
            self.unlocked = False

        def __enter__(self):
            return self

        def __exit__(self, *_args) -> None:
            return None

        def execute(self, statement, _parameters):
            sql = str(statement)
            if "pg_try_advisory_lock" in sql:
                return FakeResult(next(self.lock_attempts))
            if "pg_advisory_unlock" in sql:
                self.unlocked = True
                return FakeResult(True)
            raise AssertionError(sql)

        def commit(self) -> None:
            self.commits += 1

    class FakeEngine:
        def __init__(self, connection: FakeConnection) -> None:
            self.connection = connection
            self.disposed = False

        def connect(self) -> FakeConnection:
            return self.connection

        def dispose(self) -> None:
            self.disposed = True

    connection = FakeConnection()
    engine = FakeEngine(connection)
    upgrade_saw_connection = False

    def fake_upgrade(config: Config, revision: str) -> None:
        nonlocal upgrade_saw_connection
        assert revision == "head"
        upgrade_saw_connection = config.attributes["connection"] is connection

    monotonic_values = iter((0.0, 0.0, 1.0))
    monkeypatch.setattr(db_module, "create_engine", lambda *_args, **_kwargs: engine)
    monkeypatch.setattr(db_module.command, "upgrade", fake_upgrade)
    monkeypatch.setattr(db_module.time, "monotonic", lambda: next(monotonic_values))
    monkeypatch.setattr(db_module.time, "sleep", lambda _seconds: None)
    config = Config()

    db_module._upgrade_postgres_with_advisory_lock(
        config,
        "postgresql://vaultgate:password@db/vaultgate",
        3,
    )

    assert upgrade_saw_connection is True
    assert connection.unlocked is True
    assert connection.commits == 3
    assert engine.disposed is True
    assert "connection" not in config.attributes


def test_migrate_db_passes_settings_lock_timeout_to_postgres_upgrade(monkeypatch) -> None:
    captured: dict[str, int] = {}

    def fake_upgrade(_config: Config, _database_url: str, timeout_seconds: int) -> None:
        captured["timeout_seconds"] = timeout_seconds

    monkeypatch.setattr(db_module, "_upgrade_postgres_with_advisory_lock", fake_upgrade)

    migrate_db(
        "postgresql://vaultgate:password@db/vaultgate",
        settings=Settings(migration_lock_timeout_seconds=7),
    )

    assert captured["timeout_seconds"] == 7


def test_migrate_db_uses_the_explicit_target_when_environment_differs(
    tmp_path,
    monkeypatch,
) -> None:
    environment_database = tmp_path / "environment.db"
    target_database = tmp_path / "target.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{environment_database}")

    migrate_db(f"sqlite:///{target_database}")

    assert target_database.exists()
    assert not environment_database.exists()


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

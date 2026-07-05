import asyncio
import contextlib
import os
from collections.abc import AsyncGenerator, Generator
from pathlib import Path
from typing import Any

from alembic.config import Config
from alembic.util.exc import CommandError
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from alembic import command
from app.config import Settings
from app.runtime import AppRuntime, build_runtime

_default_runtime: AppRuntime | None = None
ALEMBIC_INI_PATH = Path(__file__).resolve().parents[1] / "alembic.ini"
DEFAULT_LOCAL_DEV_DATABASE_NAME = "vaultgate.db"


def _get_default_runtime() -> AppRuntime:
    global _default_runtime
    if _default_runtime is None:
        _default_runtime = build_runtime(Settings())
    return _default_runtime


def reset_default_runtime() -> None:
    """Reset the default runtime singleton, disposing its sync engine.

    Disposing the engine prevents unclosed-database warnings when the singleton
    is replaced between tests.
    """
    global _default_runtime
    runtime = _default_runtime
    _default_runtime = None
    if runtime is not None:
        runtime.engine.dispose()


def _iter_alembic_root_candidates() -> Generator[Path, None, None]:
    explicit_root = os.environ.get("VAULTGATE_ALEMBIC_ROOT")
    seen: set[Path] = set()

    for candidate in (
        Path(explicit_root).expanduser() if explicit_root else None,
        ALEMBIC_INI_PATH.parent,
        Path.cwd().resolve(),
        (Path.cwd() / "apps/api").resolve(),
        Path("/srv/vaultgate/apps/api"),
    ):
        if candidate is None:
            continue
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        yield resolved


def _resolve_alembic_root() -> Path:
    for candidate in _iter_alembic_root_candidates():
        if (candidate / "alembic.ini").exists() and (candidate / "alembic").is_dir():
            return candidate

    raise FileNotFoundError(
        "Could not locate Alembic configuration. Set VAULTGATE_ALEMBIC_ROOT or run from the repository root."
    )


def _build_alembic_config(database_url: str) -> Config:
    alembic_root = _resolve_alembic_root()
    config = Config(str(alembic_root / "alembic.ini"))
    config.set_main_option("script_location", str(alembic_root / "alembic"))
    config.set_main_option("prepend_sys_path", str(alembic_root))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def _resolve_sqlite_database_path(database_url: str) -> Path | None:
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database:
        return None

    database_path = Path(url.database)
    if not database_path.is_absolute():
        database_path = (Path.cwd() / database_path).resolve()
    return database_path


def _is_missing_revision_error(error: CommandError) -> bool:
    return "Can't locate revision identified by" in str(error)


def _is_default_local_dev_sqlite(database_url: str, database_path: Path | None) -> bool:
    if database_path is None or database_path.name != DEFAULT_LOCAL_DEV_DATABASE_NAME:
        return False

    url = make_url(database_url)
    if url.get_backend_name() != "sqlite":
        return False

    expected_path = (Path.cwd() / DEFAULT_LOCAL_DEV_DATABASE_NAME).resolve()
    return database_path == expected_path


def _backup_stale_local_dev_database(database_path: Path) -> Path:
    backup_path = database_path.with_name(f"{database_path.stem}.pre-baseline{database_path.suffix}")
    suffix_index = 1
    while backup_path.exists():
        backup_path = database_path.with_name(
            f"{database_path.stem}.pre-baseline-{suffix_index}{database_path.suffix}"
        )
        suffix_index += 1

    database_path.replace(backup_path)
    return backup_path


def migrate_db(
    database_url: str | None = None,
    *,
    recover_default_dev_sqlite: bool = False,
) -> Path | None:
    resolved_database_url = database_url or _get_default_runtime().settings.database_url
    config = _build_alembic_config(resolved_database_url)

    try:
        command.upgrade(config, "head")
        return None
    except CommandError as error:
        database_path = _resolve_sqlite_database_path(resolved_database_url)
        should_recover = (
            recover_default_dev_sqlite
            and _is_missing_revision_error(error)
            and _is_default_local_dev_sqlite(resolved_database_url, database_path)
            and database_path is not None
            and database_path.exists()
        )
        if not should_recover:
            raise

        if database_path is None:
            raise RuntimeError("database_path should not be None after recovery check") from None
        backup_path = _backup_stale_local_dev_database(database_path)
        command.upgrade(_build_alembic_config(resolved_database_url), "head")
        return backup_path


# Async database support for VaultGate
_async_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_async_database_url(database_url: str) -> str:
    """Convert sync database URL to async URL."""
    if database_url.startswith("sqlite://"):
        return database_url.replace("sqlite://", "sqlite+aiosqlite://")
    elif database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+asyncpg://")
    return database_url


def get_async_engine(database_url: str | None = None) -> AsyncEngine:
    """Get or create async database engine."""
    global _async_engine, _async_session_factory

    if _async_engine is None:
        resolved_url = database_url or _get_default_runtime().settings.database_url
        async_url = _get_async_database_url(resolved_url)

        is_sqlite = async_url.startswith("sqlite+aiosqlite://")
        engine_kwargs: dict[str, Any] = {"echo": False}
        if is_sqlite:
            engine_kwargs["connect_args"] = {"check_same_thread": False}
        else:
            engine_kwargs.update({
                "pool_pre_ping": True,
                "pool_size": 10,
                "max_overflow": 20,
                "pool_recycle": 1800,
            })

        _async_engine = create_async_engine(async_url, **engine_kwargs)
        _async_session_factory = async_sessionmaker(
            bind=_async_engine,
            expire_on_commit=False,
            class_=AsyncSession,
        )

    return _async_engine


def reset_async_engine() -> None:
    """Reset the async engine singleton, disposing connections when possible.

    Intended for sync test fixtures. aiosqlite connections each own their event
    loop, so disposing on a fresh loop (via asyncio.run) closes them correctly
    regardless of which loop created the engine. Use dispose_async_engine() from
    async contexts such as the application lifespan.
    """
    global _async_engine, _async_session_factory
    engine = _async_engine
    _async_engine = None
    _async_session_factory = None
    if engine is not None:
        # A running event loop may be present (e.g. called from async code);
        # in that case the owner is responsible for disposing the engine.
        with contextlib.suppress(RuntimeError):
            asyncio.run(engine.dispose())


async def dispose_async_engine() -> None:
    """Dispose and reset the async engine from an async context (e.g. lifespan)."""
    global _async_engine, _async_session_factory
    engine = _async_engine
    _async_engine = None
    _async_session_factory = None
    if engine is not None:
        await engine.dispose()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session per request."""
    get_async_engine()  # ensures engine and session factory are initialized

    if _async_session_factory is None:
        raise RuntimeError("Async session factory not initialized")

    async with _async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise

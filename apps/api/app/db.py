import os
from collections.abc import AsyncGenerator, Generator
from pathlib import Path

from alembic.config import Config
from alembic.util.exc import CommandError
from fastapi import Request
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession

from alembic import command
from app.config import Settings

ALEMBIC_INI_PATH = Path(__file__).resolve().parents[1] / "alembic.ini"
DEFAULT_LOCAL_DEV_DATABASE_NAME = "vaultgate.db"


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
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
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
    resolved_database_url = database_url or Settings().database_url
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


async def get_async_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async DB session per request."""
    session_factory = request.app.state.runtime.session_factory
    async with session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise

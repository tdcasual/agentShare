from collections.abc import Generator
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.util.exc import CommandError
from fastapi import Request
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.dependencies import get_attached_runtime
from app.runtime import AppRuntime, build_runtime


_default_runtime: AppRuntime | None = None
ALEMBIC_INI_PATH = Path(__file__).resolve().parents[1] / "alembic.ini"
DEFAULT_LOCAL_DEV_DATABASE_NAME = "agent_share.db"


def _get_default_runtime() -> AppRuntime:
    global _default_runtime
    if _default_runtime is None:
        _default_runtime = build_runtime(Settings())
    return _default_runtime


def __getattr__(name: str):
    if name == "engine":
        return _get_default_runtime().engine
    if name == "SessionLocal":
        return _get_default_runtime().session_factory
    raise AttributeError(name)


def init_db(target_engine: Engine | None = None) -> None:
    from app.orm import Base  # Imported lazily so model registration happens before create_all.
    engine_to_use = target_engine or _get_default_runtime().engine

    Base.metadata.create_all(bind=engine_to_use)


def _build_alembic_config(database_url: str) -> Config:
    config = Config(str(ALEMBIC_INI_PATH))
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

        backup_path = _backup_stale_local_dev_database(database_path)
        command.upgrade(_build_alembic_config(resolved_database_url), "head")
        return backup_path


def get_db(request: Request) -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session per request."""
    session_factory: sessionmaker[Session] = get_attached_runtime(request).session_factory
    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

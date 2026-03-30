from collections.abc import Generator
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import Request
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.dependencies import get_attached_runtime
from app.runtime import AppRuntime, build_runtime


_default_runtime: AppRuntime | None = None
ALEMBIC_INI_PATH = Path(__file__).resolve().parents[1] / "alembic.ini"


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


def migrate_db(database_url: str | None = None) -> None:
    config = Config(str(ALEMBIC_INI_PATH))
    config.set_main_option(
        "sqlalchemy.url",
        database_url or _get_default_runtime().settings.database_url,
    )
    command.upgrade(config, "head")


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

from collections.abc import Generator

from fastapi import Request
from sqlalchemy import inspect
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.runtime import AppRuntime, build_runtime


_default_runtime: AppRuntime | None = None


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
    inspector = inspect(engine_to_use)
    table_names = set(inspector.get_table_names())

    if "secrets" in table_names:
        _ensure_columns(
            "secrets",
            {
                "provider": "provider VARCHAR",
                "environment": "environment VARCHAR",
                "provider_scopes": "provider_scopes JSON",
                "resource_selector": "resource_selector VARCHAR",
                "metadata": "metadata JSON",
            },
            target_engine=engine_to_use,
        )
    if "capabilities" in table_names:
        _ensure_columns(
            "capabilities",
            {
                "required_provider": "required_provider VARCHAR",
                "required_provider_scopes": "required_provider_scopes JSON",
                "allowed_environments": "allowed_environments JSON",
                "approval_rules": "approval_rules JSON",
            },
            target_engine=engine_to_use,
        )
    if "tasks" in table_names:
        _ensure_columns(
            "tasks",
            {
                "playbook_ids": "playbook_ids JSON",
                "approval_rules": "approval_rules JSON",
            },
            target_engine=engine_to_use,
        )
    if "approval_requests" in table_names:
        _ensure_columns(
            "approval_requests",
            {
                "policy_reason": "policy_reason VARCHAR",
                "policy_source": "policy_source VARCHAR",
            },
            target_engine=engine_to_use,
        )


def _ensure_columns(
    table_name: str,
    definitions: dict[str, str],
    *,
    target_engine: Engine | None = None,
) -> None:
    engine_to_use = target_engine or _get_default_runtime().engine
    inspector = inspect(engine_to_use)
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    missing = [definition for column, definition in definitions.items() if column not in existing]
    if not missing:
        return

    with engine_to_use.begin() as connection:
        for definition in missing:
            connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {definition}")


def get_db(request: Request) -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session per request."""
    session_factory: sessionmaker[Session] = _get_default_runtime().session_factory
    if hasattr(request.app.state, "runtime"):
        session_factory = request.app.state.runtime.session_factory

    session = session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

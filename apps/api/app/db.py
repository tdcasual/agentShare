from collections.abc import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings

_settings = Settings()

engine = create_engine(
    _settings.database_url,
    echo=False,
    connect_args=(
        {"check_same_thread": False}
        if _settings.database_url.startswith("sqlite")
        else {}
    ),
)

SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    from app.orm import Base  # Imported lazily so model registration happens before create_all.

    Base.metadata.create_all(bind=engine)
    inspector = inspect(engine)
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
        )
    if "capabilities" in table_names:
        _ensure_columns(
            "capabilities",
            {
                "required_provider": "required_provider VARCHAR",
                "required_provider_scopes": "required_provider_scopes JSON",
                "allowed_environments": "allowed_environments JSON",
            },
        )


def _ensure_columns(table_name: str, definitions: dict[str, str]) -> None:
    inspector = inspect(engine)
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    missing = [definition for column, definition in definitions.items() if column not in existing]
    if not missing:
        return

    with engine.begin() as connection:
        for definition in missing:
            connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {definition}")


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session per request."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

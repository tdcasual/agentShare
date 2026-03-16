from collections.abc import Generator

from sqlalchemy import create_engine
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

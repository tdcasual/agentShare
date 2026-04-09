from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings


@dataclass(frozen=True)
class AppRuntime:
    settings: Settings
    engine: Engine
    session_factory: sessionmaker[Session]


def build_runtime(settings: Settings) -> AppRuntime:
    is_sqlite = settings.database_url.startswith("sqlite")
    engine_kwargs: dict[str, object] = {
        "echo": False,
        "connect_args": {"check_same_thread": False} if is_sqlite else {},
    }
    if not is_sqlite:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_size": 10,
            "max_overflow": 20,
            "pool_recycle": 1800,
        })
    engine = create_engine(
        settings.database_url,
        **engine_kwargs,
    )
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return AppRuntime(settings=settings, engine=engine, session_factory=session_factory)

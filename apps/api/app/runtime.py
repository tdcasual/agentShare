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
    engine = create_engine(
        settings.database_url,
        echo=False,
        connect_args=(
            {"check_same_thread": False}
            if settings.database_url.startswith("sqlite")
            else {}
        ),
    )
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    return AppRuntime(settings=settings, engine=engine, session_factory=session_factory)

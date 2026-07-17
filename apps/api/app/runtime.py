from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings


def _async_database_url(database_url: str) -> str:
    url = make_url(database_url)
    backend = url.get_backend_name()
    if backend == "sqlite":
        async_url = url.set(drivername="sqlite+aiosqlite")
        return async_url.render_as_string(hide_password=False)
    if backend == "postgresql":
        async_url = url.set(drivername="postgresql+asyncpg")
        return async_url.render_as_string(hide_password=False)
    return url.render_as_string(hide_password=False)


@dataclass(frozen=True)
class AppRuntime:
    settings: Settings
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]

    async def dispose(self) -> None:
        await self.engine.dispose()


def build_runtime(settings: Settings) -> AppRuntime:
    from app.services.encryption import get_encryption_service

    get_encryption_service(
        encryption_key=settings.encryption_key,
        encryption_keyring=settings.encryption_keyring,
        active_key_id=settings.encryption_active_key_id,
    )

    async_url = _async_database_url(settings.database_url)
    is_sqlite = async_url.startswith("sqlite+aiosqlite:")
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

    engine = create_async_engine(async_url, **engine_kwargs)
    session_factory = async_sessionmaker(
        bind=engine,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    return AppRuntime(
        settings=settings,
        engine=engine,
        session_factory=session_factory,
    )

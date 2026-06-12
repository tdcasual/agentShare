"""VaultGate test configuration.

Provides fixtures for testing VaultGate API endpoints using an in-memory SQLite
database with async support.
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import Session, sessionmaker

from app.config import Settings
from app.db import get_db, get_async_db
from app.factory import create_app
from app.observability import reset_metrics
from app.orm import Base  # triggers all model registration
from app.runtime import AppRuntime, build_runtime

# Suppress encryption key requirement in test environment
os.environ.setdefault(
    "ENCRYPTION_KEY",
    "ZGV2LW9ubHktMzItYnl0ZS1lbmNyeXB0aW9uLWtleSE=",
)

API_ROOT = Path(__file__).resolve().parents[1]


# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------


def _run_alembic_upgrade(database_url: str) -> None:
    """Run Alembic migration against the given database URL."""
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url

    subprocess.run(
        [
            sys.executable,
            "-c",
            "from alembic.config import main; main(argv=['-c', 'alembic.ini', 'upgrade', 'head'])",
        ],
        cwd=API_ROOT,
        check=True,
        env=env,
    )


@pytest.fixture
def test_database_url(tmp_path: Path) -> str:
    """Create a temporary SQLite database with VaultGate schema."""
    db_path = tmp_path / "vaultgate_test.db"
    database_url = f"sqlite:///{db_path}"
    _run_alembic_upgrade(database_url)
    return database_url


@pytest.fixture
def test_settings(test_database_url: str) -> Settings:
    """Provide Settings configured for testing."""
    return Settings(
        database_url=test_database_url,
        encryption_key="ZGV2LW9ubHktMzItYnl0ZS1lbmNyeXB0aW9uLWtleSE=",
        session_secret="test-session-secret-for-pytest-only",
        session_secure=False,
        cors_allowed_origins="http://localhost:3000",
    )


@pytest.fixture
def test_engine(test_database_url: str):
    """Provide a synchronous SQLAlchemy engine for tests."""
    engine = create_engine(
        test_database_url,
        connect_args={"check_same_thread": False},
    )
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def test_session_factory(test_engine):
    """Provide a session factory bound to the test engine."""
    return sessionmaker(bind=test_engine, expire_on_commit=False)


@pytest.fixture
def db_session(test_session_factory):
    """Provide a single database session for a test."""
    session = test_session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def test_app(test_engine, test_session_factory, test_settings: Settings):
    """Create a VaultGate FastAPI app wired to the test database."""
    from app.services.encryption import reset_encryption_service
    reset_encryption_service()

    runtime = AppRuntime(
        settings=test_settings,
        engine=test_engine,
        session_factory=test_session_factory,
    )
    app = create_app(test_settings, runtime=runtime)

    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    # Use a module-level db_session via the session factory
    session = test_session_factory()

    def _override_sync_db():
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_sync_db

    try:
        yield app
    finally:
        app.dependency_overrides.clear()
        reset_encryption_service()


@pytest.fixture
def client(test_app):
    """Provide a TestClient wired to the test app."""
    with TestClient(test_app) as c:
        yield c


@pytest.fixture(autouse=True)
def reset_observability_metrics():
    """Reset observability metrics between tests."""
    reset_metrics()

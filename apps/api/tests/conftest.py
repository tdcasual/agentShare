"""VaultGate test configuration.

Provides fixtures for testing VaultGate API endpoints using an in-memory SQLite
database.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.factory import create_app
from app.orm import Base  # noqa: F401  # triggers all model registration
from app.runtime import build_runtime

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
    os.environ["DATABASE_URL"] = database_url
    return database_url


@pytest.fixture
def test_settings(test_database_url: str) -> Settings:
    """Provide Settings configured for testing."""
    return Settings(
        database_url=test_database_url,
        encryption_key="ZGV2LW9ubHktMzItYnl0ZS1lbmNyeXB0aW9uLWtleSE=",
        session_secure=False,
        cors_allowed_origins="http://localhost:3000",
    )


@pytest.fixture
def test_app(test_settings: Settings):
    """Create a VaultGate FastAPI app wired to the test database.

    NOTE: get_async_db is NOT overridden. Routes that use it will go through
    the real async engine path, which TestClient handles correctly via its
    internal event loop. The async engine picks up DATABASE_URL from the
    default runtime settings (env var or default).
    """
    from app.services.encryption import reset_encryption_service

    reset_encryption_service()

    runtime = build_runtime(test_settings)
    app = create_app(test_settings, runtime=runtime)

    try:
        yield app
    finally:
        reset_encryption_service()
        asyncio.run(runtime.dispose())


@pytest.fixture
def client(test_app):
    """Provide a TestClient wired to the test app."""
    with TestClient(test_app) as c:
        yield c

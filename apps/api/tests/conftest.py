import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import reset_store


@pytest.fixture(autouse=True)
def reset_state() -> None:
    reset_store()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)

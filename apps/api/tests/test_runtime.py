from fastapi import Depends, Request
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_db
from app.factory import create_app


def test_get_db_uses_request_runtime_session_factory(tmp_path):
    db_path = tmp_path / "runtime-request.db"
    app = create_app(Settings(database_url=f"sqlite:///{db_path}"))
    observed: dict[str, bool] = {}

    @app.get("/_runtime/db-check")
    def db_check(request: Request, session: Session = Depends(get_db)) -> dict[str, bool]:
        observed["uses_runtime_engine"] = session.get_bind() is request.app.state.runtime.engine
        return {"ok": True}

    with TestClient(app) as client:
        response = client.get("/_runtime/db-check")

    assert response.status_code == 200
    assert observed["uses_runtime_engine"] is True

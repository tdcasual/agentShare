from sqlalchemy import text

from app.config import Settings
from app.runtime import build_runtime


def test_session_connects_and_executes_query():
    runtime = build_runtime(Settings(database_url="sqlite:///:memory:"))
    with runtime.session_factory() as session:
        result = session.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_runtime_engine_uses_configured_url(tmp_path):
    runtime = build_runtime(Settings(database_url=f"sqlite:///{tmp_path / 'runtime-test.db'}"))
    assert str(runtime.engine.url).endswith("runtime-test.db")

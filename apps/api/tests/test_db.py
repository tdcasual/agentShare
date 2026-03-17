from sqlalchemy import text

from app.db import SessionLocal, engine


def test_session_connects_and_executes_query():
    with SessionLocal() as session:
        result = session.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_engine_uses_configured_url():
    url = str(engine.url)
    assert "sqlite" in url or "postgresql" in url

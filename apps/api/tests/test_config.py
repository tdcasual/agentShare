from app.config import Settings


def test_settings_default_to_local_services():
    settings = Settings()

    assert settings.database_url.endswith("agent_share")
    assert settings.redis_url == "redis://localhost:6379/0"
    assert settings.secret_backend == "openbao"

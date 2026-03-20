from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./agent_share.db"
    redis_url: str = "redis://localhost:6379/0"
    secret_backend: str = "openbao"
    openbao_addr: str | None = None
    openbao_token: str | None = None
    openbao_mount: str = "secret"
    openbao_prefix: str = "agent-share"
    bootstrap_agent_key: str = "changeme-bootstrap-key"
    management_session_secret: str = "changeme-management-session-secret"
    management_session_cookie_name: str = "management_session"
    management_session_ttl_seconds: int = 60 * 60 * 12
    management_session_secure: bool = False

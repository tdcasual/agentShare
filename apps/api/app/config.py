from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./agent_share.db"
    redis_url: str = "redis://localhost:6379/0"
    secret_backend: str = "openbao"
    openbao_addr: str | None = None
    openbao_token: str | None = None
    openbao_mount: str = "secret"
    openbao_prefix: str = "agent-share"

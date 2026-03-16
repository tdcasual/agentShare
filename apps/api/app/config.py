from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/agent_share"
    redis_url: str = "redis://localhost:6379/0"
    secret_backend: str = "openbao"
    openbao_addr: str | None = None
    openbao_token: str | None = None
    openbao_mount: str = "secret"
    openbao_prefix: str = "agent-share"

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Pet Life Intelligence"
    database_url: str = "postgresql+asyncpg://pli:pli_dev_password@localhost:5432/pli"
    redis_url: str = "redis://localhost:6379/0"
    ai_provider: str = "mock"
    ai_model: str = "mock-v1"
    dev_auth_enabled: bool = True

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()

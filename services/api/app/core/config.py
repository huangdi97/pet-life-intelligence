from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "Pet Life Intelligence"

    database_url: str = "postgresql+asyncpg://pli:pli_dev_password@localhost:55432/pli"
    test_database_url: str = (
        "postgresql+asyncpg://pli:pli_dev_password@localhost:55432/pli_test"
    )
    redis_url: str = "redis://localhost:56379/0"

    s3_endpoint: str = "http://localhost:59000"
    s3_access_key: str = "pli_minio"
    s3_secret_key: str = "pli_minio_dev_secret"
    s3_bucket: str = "pli-dev"
    s3_region: str = "us-east-1"
    s3_secure: bool = False
    storage_backend: str = "minio"  # minio | local
    local_upload_dir: str = "artifacts/uploads"

    ai_provider: str = "mock"
    ai_model: str = "mock-v1"
    ai_api_key: str = ""
    ai_timeout_seconds: float = 30.0

    dev_auth_enabled: bool = True
    dev_auth_user_id: str = "00000000-0000-0000-0000-000000000001"
    session_secret: str = "CHANGE_ME_DEV_ONLY"
    care_card_signing_secret: str = "CHANGE_ME_DEV_ONLY"

    rate_limit_enabled: bool = False
    rate_limit_per_minute: int = 120
    max_upload_mb: int = 25

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

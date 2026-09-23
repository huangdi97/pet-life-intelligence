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
    ai_base_url: str = ""
    ai_max_retries: int = 2

    dev_auth_enabled: bool = True
    dev_auth_user_id: str = "00000000-0000-0000-0000-000000000001"
    session_secret: str = "CHANGE_ME_DEV_ONLY"
    care_card_signing_secret: str = "CHANGE_ME_DEV_ONLY"

    # --- real auth (Stage E) ---
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 14
    auth_max_login_attempts: int = 5
    auth_lockout_minutes: int = 15
    public_app_url: str = "http://localhost:3000"
    email_from: str = "noreply@pli.example.com"
    # verification delivery: console | smtp (smtp = EXTERNAL_BLOCKED until creds)
    email_delivery: str = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    # --- pilot mode (Stage E Phase O) ---
    pilot_mode: bool = False  # invite-only real-user environment
    app_version: str = "1.1.0"

    # --- WeChat mini program (Stage E Phase P) ---
    wechat_app_id: str = ""
    wechat_app_secret: str = ""
    # allow mini-program dev login via backend dev-auth sandbox (never in prod)
    mini_dev_login_enabled: bool = True

    rate_limit_enabled: bool = False
    rate_limit_per_minute: int = 120
    # SV-007: distributed limiting backend — "auto" | "redis" | "in_process".
    # auto = try Redis, log + fall back to in-process when unreachable.
    rate_limit_backend: str = "auto"
    max_upload_mb: int = 25


    # production hardening
    db_pool_enabled: bool = False  # tests/CI keep NullPool; production enables pooling
    db_pool_size: int = 10
    db_pool_max_overflow: int = 20
    db_pool_timeout_seconds: float = 30.0
    json_logs_enabled: bool = False  # structlog JSON formatter (production)
    log_level: str = "INFO"
    api_request_timeout_seconds: float = 30.0
    graceful_shutdown_seconds: int = 15

    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3100,http://127.0.0.1:3100"
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def validate_production(self) -> list[str]:
        """Return a list of fatal config problems for production env.
        Callers should refuse to start the app if non-empty (Stage E §8)."""
        if self.app_env != "production":
            return []
        problems: list[str] = []
        if self.dev_auth_enabled:
            problems.append("DEV_AUTH_ENABLED must be false in production")
        if self.session_secret in ("", "CHANGE_ME_DEV_ONLY"):
            problems.append("SESSION_SECRET must be a real generated secret in production")
        if self.care_card_signing_secret in ("", "CHANGE_ME_DEV_ONLY"):
            problems.append("CARE_CARD_SIGNING_SECRET must be a real generated secret in production")
        if "CHANGE_ME" in (self.s3_access_key + self.s3_secret_key):
            problems.append("S3 credentials must be real in production")
        if self.database_url.startswith("postgresql+asyncpg://pli:pli_dev_password"):
            problems.append("DATABASE_URL must be the production database in production")
        if not self.cors_origins or "*" in self.cors_origins.split(","):
            problems.append("CORS_ORIGINS must be an explicit allowlist (no *) in production")
        return problems


@lru_cache
def get_settings() -> Settings:
    return Settings()

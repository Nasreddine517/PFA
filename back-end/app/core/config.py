from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NeuroScan API"
    api_v1_prefix: str = "/api"
    mongo_db_name: str = "neuroscan"
    mongo_uri: str = Field(..., alias="MONGO_URI")
    secret_key: str = Field(..., alias="SECRET_KEY")
    algorithm: str = Field("HS256", alias="ALGORITHM")
    token_expire_minutes: int = Field(60, alias="TOKEN_EXPIRE_MINUTES")
    model_provider: str = Field("yolo", alias="MODEL_PROVIDER")
    model_weights_path: str = Field("model/best.pt", alias="MODEL_WEIGHTS_PATH")
    model_confidence_threshold: float = Field(0.25, alias="MODEL_CONFIDENCE_THRESHOLD")
    max_upload_size_mb: int = Field(15, alias="MAX_UPLOAD_SIZE_MB")
    allowed_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:8080",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:8080",
        ],
        alias="ALLOWED_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

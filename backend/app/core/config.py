from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AeroGuard"
    environment: str = "development"
    database_url: str = "sqlite:///./aeroguard.db"
    cors_origins: str = "http://localhost:5173"
    model_version: str = "lstm-autoencoder-demo-v1"
    risk_model_path: str = "models/risk_classifier.pt"
    risk_model_metadata_path: str = "models/risk_classifier_metadata.json"
    anomaly_threshold: float = 0.58
    stale_after_seconds: int = 90

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

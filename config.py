"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    gemini_api_key: str = "AQ.Ab8RN6KEs3hUMb0sHeen3e2uSJLn0HfRl-eP8C17TMMUBXkIRg"
    gemini_model: str = "gemma-3-27b-it"

    model_config = {"env_prefix": "", "case_sensitive": False}


settings = Settings()  # type: ignore[call-arg]

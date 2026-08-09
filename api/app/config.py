"""Central settings, loaded from env vars (Zerops injects these via envSecrets)."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/duelarena"
    CACHE_URL: str = "redis://localhost:6379"
    GROQ_API_KEY: str = ""
    GROQ_MODEL_PRIMARY: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_SECONDARY: str = "llama-3.1-8b-instant"
    GROQ_MODEL_TERTIARY: str = "gemma2-9b-it"
    DUEL_DURATION_SECONDS: int = 300
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"


settings = Settings()

def normalized_database_url() -> str:
    """SQLAlchemy async needs the +asyncpg driver; Zerops/most providers hand back
    a plain postgresql:// or postgres:// URL, so patch it here rather than requiring the env
    var itself to be SQLAlchemy-flavored."""
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

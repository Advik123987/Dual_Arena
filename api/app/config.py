"""Central settings + mode configuration."""
from pydantic_settings import BaseSettings

MODE_DURATIONS = {
    "rapid_fire": 300,    # 5 min
    "sprint": 900,        # 15 min
    "full_battle": 1800,  # 30 min
    "marathon": 3600,     # 60 min
}

MODE_PROBLEM_TYPES = {
    "rapid_fire": ["mcq", "short_answer"],
    "sprint": ["mcq", "short_answer"],
    "full_battle": ["code", "code_java"],
    "marathon": ["code", "code_java"],
}


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/duelarena"
    CACHE_URL: str = "redis://localhost:6379"
    GROQ_API_KEY: str = ""
    GROQ_MODEL_PRIMARY: str = "llama-3.3-70b-versatile"
    GROQ_MODEL_SECONDARY: str = "llama-3.1-8b-instant"
    GROQ_MODEL_TERTIARY: str = "gemma2-9b-it"
    DUEL_DURATION_SECONDS: int = 1800
    CORS_ORIGINS: str = "*"

    class Config:
        env_file = ".env"


settings = Settings()


def normalized_database_url() -> str:
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url

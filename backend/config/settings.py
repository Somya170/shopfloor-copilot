"""
factory-ai-platform · config/settings.py
Central configuration — all values read from environment variables.
"""
import os
from datetime import timedelta


class Settings:
    # ── App ────────────────────────────────────────────────────
    APP_NAME    = "Factory AI Platform"
    VERSION     = "1.0.0"
    DEBUG       = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY  = os.getenv("SECRET_KEY", "change-me-in-production-please")

    # ── JWT ────────────────────────────────────────────────────
    JWT_SECRET          = os.getenv("JWT_SECRET", "jwt-secret-change-in-prod")
    JWT_ALGORITHM       = "HS256"
    JWT_ACCESS_EXPIRES  = timedelta(hours=int(os.getenv("JWT_ACCESS_HOURS", "8")))
    JWT_REFRESH_EXPIRES = timedelta(days=int(os.getenv("JWT_REFRESH_DAYS", "30")))

    # ── Database ───────────────────────────────────────────────
    DB_HOST     = os.getenv("DB_HOST",     "localhost")
    DB_PORT     = int(os.getenv("DB_PORT", "5432"))
    DB_NAME     = os.getenv("DB_NAME",     "factory_ai")
    DB_USER     = os.getenv("DB_USER",     "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

    @classmethod
    def get_db_url(cls) -> str:
        return (
            f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}"
            f"@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        )

    @classmethod
    def get_async_db_url(cls) -> str:
        return (
            f"postgresql+asyncpg://{cls.DB_USER}:{cls.DB_PASSWORD}"
            f"@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
        )

    # ── Redis ──────────────────────────────────────────────────
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB   = int(os.getenv("REDIS_DB",   "0"))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

    @classmethod
    def get_redis_url(cls) -> str:
        if cls.REDIS_PASSWORD:
            return f"redis://:{cls.REDIS_PASSWORD}@{cls.REDIS_HOST}:{cls.REDIS_PORT}/{cls.REDIS_DB}"
        return f"redis://{cls.REDIS_HOST}:{cls.REDIS_PORT}/{cls.REDIS_DB}"

    # ── Qdrant ─────────────────────────────────────────────────
    QDRANT_HOST       = os.getenv("QDRANT_HOST",       "localhost")
    QDRANT_PORT       = int(os.getenv("QDRANT_PORT",   "6333"))
    QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "factory_knowledge")

    # ── Groq ───────────────────────────────────────────────────
    GROQ_API_KEY  = os.getenv("GROQ_API_KEY",  "")
    GROQ_MODEL    = os.getenv("GROQ_MODEL",    "llama3-8b-8192")

    # ── Ollama (Local/Offline SLM) ─────────────────────────────
    OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

    # ── LLM Mode ───────────────────────────────────────────────
    # 'auto'   = internet check → Groq if available, Ollama fallback
    # 'groq'   = always Groq
    # 'ollama' = always Ollama
    LLM_MODE = os.getenv("LLM_MODE", "auto")

    # Internet check URL
    INTERNET_CHECK_URL     = os.getenv("INTERNET_CHECK_URL", "https://api.groq.com")
    INTERNET_CHECK_TIMEOUT = float(os.getenv("INTERNET_CHECK_TIMEOUT", "2.0"))

    # ── ML ─────────────────────────────────────────────────────
    ANOMALY_CONTAMINATION  = float(os.getenv("ANOMALY_CONTAMINATION",  "0.05"))
    ANOMALY_RETRAIN_ROWS   = int(os.getenv("ANOMALY_RETRAIN_ROWS",    "500"))

    # ── Simulation ─────────────────────────────────────────────
    SIMULATOR_INTERVAL_SEC = float(os.getenv("SIMULATOR_INTERVAL_SEC", "2"))
    NUM_MACHINES           = int(os.getenv("NUM_MACHINES", "5"))

    # ── CORS ───────────────────────────────────────────────────
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")


settings = Settings()
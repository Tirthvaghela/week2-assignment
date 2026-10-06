"""Application settings, read from environment variables (see .env.example)."""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")


def _split(value):
    return [item.strip() for item in value.split(",") if item.strip()]


def _flag(name, default="0"):
    return os.getenv(name, default) == "1"


class Config:
    # --- Tokens -----------------------------------------------------------
    # No secret is written in the code. Without JWT_SECRET a random key is
    # made for this run only (app.py logs a warning when that happens). The
    # placeholder from .env.example is public, so it counts as not set.
    JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
    JWT_SECRET_IS_TEMPORARY = JWT_SECRET in ("", "replace-with-a-long-random-value")
    if JWT_SECRET_IS_TEMPORARY:
        JWT_SECRET = secrets.token_hex(32)
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

    # --- Login cookie -----------------------------------------------------
    COOKIE_NAME = "access_token"
    COOKIE_SECURE = _flag("COOKIE_SECURE")
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax")

    # --- Passwords --------------------------------------------------------
    BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))

    # --- Database ---------------------------------------------------------
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "authentication_system")
    MONGO_TIMEOUT_MS = int(os.getenv("MONGO_TIMEOUT_MS", "3000"))

    # --- Server -----------------------------------------------------------
    CORS_ORIGINS = _split(
        os.getenv("CORS_ORIGINS", "http://localhost:5175,http://127.0.0.1:5175")
    )
    HOST = os.getenv("FLASK_HOST", "127.0.0.1")
    PORT = int(os.getenv("FLASK_PORT", "5001"))
    DEBUG = _flag("FLASK_DEBUG")

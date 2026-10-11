"""
backend/config.py
=================
Application settings using pydantic-settings.
Validates environment variables at application startup.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core application settings validated from environment and .env."""

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase credentials
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_KEY: str = Field(..., description="Supabase anon public key")

    # Groq API
    GROQ_API_KEY: str = Field(..., description="Groq API key for Llama 3")

    # Optional / Future services
    REDIS_URL: Optional[str] = Field("redis://localhost:6379/0", description="Redis connection URL")
    STRIPE_SECRET_KEY: Optional[str] = Field(None, description="Stripe secret key")
    STRIPE_WEBHOOK_SECRET: Optional[str] = Field(None, description="Stripe webhook secret")

    # Environment & CORS
    ENVIRONMENT: str = Field("development", description="App environment")
    FRONTEND_URL: str = Field("http://localhost:3000", description="Frontend origin for CORS")


@lru_cache()
def get_settings() -> Settings:
    """Returns cached application settings instance."""
    return Settings()

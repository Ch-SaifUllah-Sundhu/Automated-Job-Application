"""
backend/main.py
===============
FastAPI application factory for the Job Application Assistant backend.
Registers modular routers, CORS middleware, and application lifecycle.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Dict

import sys
from pathlib import Path

# Ensure backend directory is in sys.path when running from project root
_backend_dir = str(Path(__file__).resolve().parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import applications, auth, jobs, profile

log = logging.getLogger("main")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Application startup and shutdown hooks."""
    settings = get_settings()
    log.info("Starting Job Application Assistant API (env: %s)...", settings.ENVIRONMENT)
    yield
    log.info("Shutting down Job Application Assistant API.")


def create_app() -> FastAPI:
    """Factory creating and configuring the FastAPI instance."""
    settings = get_settings()

    app = FastAPI(
        title="Job Application Assistant API",
        description=(
            "Multi-tenant SaaS backend for automated job search, "
            "document tailoring, and application tracking."
        ),
        version="0.5.0",
        lifespan=lifespan,
    )

    # CORS configuration
    origins = [
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register API Routers
    app.include_router(auth.router)
    app.include_router(jobs.router)
    app.include_router(applications.router)
    app.include_router(profile.router)

    # Root Health Check
    @app.get("/", summary="Health Check", tags=["System"])
    def health_check() -> Dict[str, str]:
        return {
            "status": "ok",
            "version": app.version,
            "environment": settings.ENVIRONMENT,
        }

    return app


app = create_app()

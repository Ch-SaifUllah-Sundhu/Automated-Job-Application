"""
backend/workers/celery_app.py
==============================
Module 8 — Celery instance configuration.

Celery is used to run background tasks (e.g. Playwright form submission)
without blocking the FastAPI HTTP request-response cycle.

Broker  : Redis  (REDIS_URL env var, defaults to localhost:6379/0)
Backend : Redis  (same instance, database 1)

Usage:
  Start worker: celery -A workers.celery_app worker --loglevel=info
"""

from __future__ import annotations

import os

from celery import Celery
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
REDIS_BACKEND_URL: str = os.environ.get("REDIS_BACKEND_URL", REDIS_URL.replace("/0", "/1"))

celery_app = Celery(
    "job_pilot",
    broker=REDIS_URL,
    backend=REDIS_BACKEND_URL,
    include=["workers.tasks.automation_task"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Retry failed tasks up to 3 times with 60s delay
    task_max_retries=3,
    task_default_retry_delay=60,
    # Task routing
    task_routes={
        "workers.tasks.automation_task.submit_application": {"queue": "automation"},
    },
)

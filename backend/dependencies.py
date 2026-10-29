"""
backend/dependencies.py
=======================
FastAPI dependency injection utilities:
- Supabase client provider
- get_current_user: verifies Supabase JWT via auth.get_user(token)
"""

from __future__ import annotations

import logging
from typing import Any, Dict

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from config import get_settings

log = logging.getLogger("dependencies")
security = HTTPBearer(auto_error=False)


def get_supabase_client(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
) -> Client:
    """Returns an initialized Supabase client scoped with user credentials for RLS if present."""
    settings = get_settings()
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    if isinstance(credentials, HTTPAuthorizationCredentials) and credentials.credentials:
        try:
            client.postgrest.auth(credentials.credentials)
        except Exception as e:
            log.warning("Could not attach user JWT to Supabase client: %s", e)
    return client


def get_supabase_admin_client() -> Client:
    """
    Returns an administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY.
    Used strictly for trusted server-side background and administration tasks (account deletion, celery tasks).
    Never exposed to client bundles or browser endpoints.
    """
    settings = get_settings()
    import os
    service_key = (
        getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", None)
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or getattr(settings, "SUPABASE_SERVICE_KEY", None)
        or os.environ.get("SUPABASE_SERVICE_KEY")
    )
    if not service_key:
        log.warning("Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_SERVICE_KEY set; falling back to SUPABASE_KEY for server operations")
        service_key = settings.SUPABASE_KEY
    return create_client(settings.SUPABASE_URL, service_key)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
    supabase: Client = Depends(get_supabase_client),
) -> Dict[str, Any]:
    """
    Verifies Supabase JWT from the Authorization header.
    Returns user dictionary containing 'id' and 'email'.
    Raises 401 if credentials are missing or invalid.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = user_response.user
        return {
            "id": str(user.id),
            "email": getattr(user, "email", None),
        }
    except HTTPException:
        raise
    except Exception as exc:
        log.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

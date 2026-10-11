"""
backend/routers/auth.py
=======================
Authentication endpoints:
- GET  /auth/me      Retrieve current user's profile and auth information
- POST /auth/logout  Sign out and invalidate current session
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from supabase import Client

from dependencies import get_current_user, get_supabase_client

log = logging.getLogger("routers.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])


class ProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    base_resume_text: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


@router.get("/me", response_model=ProfileResponse, summary="Get current user profile")
async def get_me(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    """
    Fetches the profile for the authenticated user from the profiles table.
    If the profile does not exist yet, returns a minimal profile with user ID.
    """
    user_id = current_user["id"]
    try:
        response = (
            supabase.table("profiles")
            .select("id, full_name, phone, linkedin_url, github_url, base_resume_text")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if response and response.data and len(response.data) > 0:
            data = response.data[0]
            return ProfileResponse(
                id=user_id,
                email=current_user.get("email"),
                full_name=data.get("full_name"),
                phone=data.get("phone"),
                linkedin_url=data.get("linkedin_url"),
                github_url=data.get("github_url"),
                base_resume_text=data.get("base_resume_text"),
            )
        # Fallback if profile row is not yet initialized
        return ProfileResponse(id=user_id, email=current_user.get("email"))
    except Exception as exc:
        log.error("Error retrieving profile for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile",
        ) from exc


@router.post("/logout", response_model=MessageResponse, summary="Sign out current session")
async def logout(
    current_user: Dict[str, Any] = Depends(get_current_user),
) -> MessageResponse:
    """Signs out the user and clears active session."""
    log.info("User %s logged out", current_user.get("id"))
    return MessageResponse(message="Successfully logged out")

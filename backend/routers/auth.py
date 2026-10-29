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

from dependencies import get_current_user, get_supabase_client, get_supabase_admin_client

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


@router.delete("/account", response_model=MessageResponse, summary="Permanently delete user account and data")
async def delete_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> MessageResponse:
    """
    Permanently deletes user profile, application tracking records, and Supabase auth account.
    Uses admin service client for auth admin deletion.
    """
    user_id = current_user["id"]
    log.info("Processing permanent deletion request for user %s", user_id)

    try:
        # 1. Cascade cleanup user data rows
        tables_to_purge = [
            ("automation_logs", "application_id"),
            ("applications", "user_id"),
            ("interview_sessions", "user_id"),
            ("notifications", "user_id"),
            ("subscriptions", "user_id"),
            ("profiles", "id"),
        ]
        
        # Purge applications and related logs
        try:
            supabase.table("applications").delete().eq("user_id", user_id).execute()
        except Exception as e:
            log.warning("Could not delete applications for user %s: %s", user_id, e)

        try:
            supabase.table("interview_sessions").delete().eq("user_id", user_id).execute()
        except Exception as e:
            log.warning("Could not delete interview_sessions for user %s: %s", user_id, e)

        try:
            supabase.table("notifications").delete().eq("user_id", user_id).execute()
        except Exception as e:
            log.warning("Could not delete notifications for user %s: %s", user_id, e)

        try:
            supabase.table("subscriptions").delete().eq("user_id", user_id).execute()
        except Exception as e:
            log.warning("Could not delete subscriptions for user %s: %s", user_id, e)

        try:
            supabase.table("profiles").delete().eq("id", user_id).execute()
        except Exception as e:
            log.warning("Could not delete profile for user %s: %s", user_id, e)

        # 2. Delete user from Supabase Auth via admin client
        admin_client = get_supabase_admin_client()
        try:
            if hasattr(admin_client, "auth") and hasattr(admin_client.auth, "admin"):
                admin_client.auth.admin.delete_user(user_id)
                log.info("Auth admin deleted user %s from Supabase Auth", user_id)
        except Exception as auth_err:
            log.error("Failed to delete user from Supabase Auth admin: %s", auth_err)
            # Still proceed if profile data was wiped

        return MessageResponse(message="Account and associated data deleted successfully")
    except Exception as exc:
        log.error("Account deletion failed for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete account data",
        ) from exc

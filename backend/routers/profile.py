"""
backend/routers/profile.py
==========================
User profile and resume management endpoints:
- GET  /profile         Retrieve authenticated user profile
- PUT  /profile         Update profile personal and contact info
- POST /profile/resume  Upload and parse resume document (PDF / DOCX)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from supabase import Client

from dependencies import get_current_user, get_supabase_client
from services.resume_parser import parse_resume

log = logging.getLogger("routers.profile")
router = APIRouter(prefix="/profile", tags=["Profile"])


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=120)
    phone: Optional[str] = Field(None, max_length=50)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    github_url: Optional[str] = Field(None, max_length=255)
    base_resume_text: Optional[str] = Field(None, description="Raw plain text resume")


class ProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    base_resume_text: Optional[str] = None


class ResumeUploadResponse(BaseModel):
    filename: str
    characters_extracted: int
    preview: str
    base_resume_text: str


@router.get("", response_model=ProfileResponse, summary="Get user profile")
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    """Retrieves the profile record for the authenticated user."""
    user_id = current_user["id"]
    try:
        res = (
            supabase.table("profiles")
            .select("id, full_name, phone, linkedin_url, github_url, base_resume_text")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if res and res.data and len(res.data) > 0:
            row = res.data[0]
            return ProfileResponse(
                id=user_id,
                full_name=row.get("full_name"),
                phone=row.get("phone"),
                linkedin_url=row.get("linkedin_url"),
                github_url=row.get("github_url"),
                base_resume_text=row.get("base_resume_text"),
            )
        # Return empty profile if not yet created in table
        return ProfileResponse(id=user_id)
    except Exception as exc:
        log.error("Failed to fetch profile for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile",
        ) from exc


@router.put("", response_model=ProfileResponse, summary="Update user profile")
async def update_profile(
    req: ProfileUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    """Updates profile information for the authenticated user."""
    user_id = current_user["id"]
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    update_data["id"] = user_id

    try:
        res = supabase.table("profiles").upsert(update_data, on_conflict="id").execute()
        if not res or not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile",
            )
        saved = res.data[0]
        return ProfileResponse(
            id=user_id,
            full_name=saved.get("full_name"),
            phone=saved.get("phone"),
            linkedin_url=saved.get("linkedin_url"),
            github_url=saved.get("github_url"),
            base_resume_text=saved.get("base_resume_text"),
        )
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Failed to update profile for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        ) from exc


@router.post("/resume", response_model=ResumeUploadResponse, summary="Upload resume document")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ResumeUploadResponse:
    """
    Parses an uploaded PDF or DOCX file, extracts text, and stores it in profiles.base_resume_text.
    """
    user_id = current_user["id"]
    filename = file.filename or "resume.pdf"

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        extracted_text = parse_resume(content, filename)
        if not extracted_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Could not extract any text from the provided document",
            )

        # Upsert into user profile
        supabase.table("profiles").upsert(
            {"id": user_id, "base_resume_text": extracted_text},
            on_conflict="id",
        ).execute()

        preview = extracted_text[:300] + ("..." if len(extracted_text) > 300 else "")
        return ResumeUploadResponse(
            filename=filename,
            characters_extracted=len(extracted_text),
            preview=preview,
            base_resume_text=extracted_text,
        )
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        ) from val_err
    except HTTPException:
        raise
    except Exception as exc:
        log.error("Resume upload processing failed for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process resume: {exc}",
        ) from exc

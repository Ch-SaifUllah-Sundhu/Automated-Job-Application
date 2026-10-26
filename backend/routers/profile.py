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
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from supabase import Client

from dependencies import get_current_user, get_supabase_client
from services.embedding_service import embed_text
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
    embedding: Optional[List[float]] = None


class ResumeUploadResponse(BaseModel):
    filename: str
    characters_extracted: int
    preview: str
    base_resume_text: str


def _parse_embedding(val: Any) -> Optional[List[float]]:
    if val is None:
        return None
    if isinstance(val, list):
        return [float(x) for x in val]
    if isinstance(val, str):
        s = val.strip()
        if s.startswith("[") and s.endswith("]"):
            try:
                import json
                return [float(x) for x in json.loads(s)]
            except Exception:
                pass
    return None


@router.get("", response_model=ProfileResponse, summary="Get user profile")
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client),
) -> ProfileResponse:
    """Retrieves the profile record for the authenticated user."""
    user_id = current_user["id"]
    try:
        try:
            res = (
                supabase.table("profiles")
                .select("id, full_name, phone, linkedin_url, github_url, base_resume_text, embedding")
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
        except Exception as col_err:
            log.warning("Query with embedding failed (%s), querying without embedding...", col_err)
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
                embedding=_parse_embedding(row.get("embedding")),
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

    # Module 7: Re-embed trigger on resume text update
    if update_data.get("base_resume_text"):
        try:
            update_data["embedding"] = embed_text(update_data["base_resume_text"])
        except Exception as e:
            log.warning("Embedding generation skipped: %s", e)

    try:
        try:
            res = supabase.table("profiles").upsert(update_data, on_conflict="id").execute()
        except Exception as exc:
            # If embedding column is not yet present in Supabase table, retry without it
            if "embedding" in update_data:
                log.warning("Upsert with embedding failed (%s); retrying without embedding...", exc)
                update_data.pop("embedding", None)
                res = supabase.table("profiles").upsert(update_data, on_conflict="id").execute()
            else:
                raise

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
            embedding=_parse_embedding(saved.get("embedding")),
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
    Parses an uploaded PDF or DOCX file, extracts text, computes 384-d SBERT embedding,
    and stores it in profiles.base_resume_text and profiles.embedding.
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

        # Module 7: Compute dense 384-d Sentence-BERT embedding
        embedding = None
        try:
            embedding = embed_text(extracted_text)
        except Exception as e:
            log.warning("Failed to generate embedding for uploaded resume: %s", e)

        # Upsert into user profile (with fallback if embedding column is not in DB)
        profile_row: Dict[str, Any] = {
            "id": user_id,
            "base_resume_text": extracted_text,
        }
        if embedding is not None:
            profile_row["embedding"] = embedding

        try:
            supabase.table("profiles").upsert(profile_row, on_conflict="id").execute()
        except Exception as exc:
            if "embedding" in profile_row:
                log.warning("Resume upsert with embedding failed (%s), retrying without embedding...", exc)
                profile_row.pop("embedding", None)
                supabase.table("profiles").upsert(profile_row, on_conflict="id").execute()
            else:
                raise

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

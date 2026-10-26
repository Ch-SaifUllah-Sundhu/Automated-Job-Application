"""
backend/services
================
Service layer containing core business logic decoupled from HTTP routing:
- resume_parser: PDF/DOCX text extraction
- embedding_service: Sentence-BERT dense 384-d vector embeddings
- match_service: Semantic match scoring & explainable skill gap detection
"""

from services.embedding_service import compute_cosine_similarity, embed_text, embed_texts
from services.match_service import compute_match_score, identify_skill_gaps
from services.resume_parser import parse_resume

__all__ = [
    "parse_resume",
    "embed_text",
    "embed_texts",
    "compute_cosine_similarity",
    "compute_match_score",
    "identify_skill_gaps",
]

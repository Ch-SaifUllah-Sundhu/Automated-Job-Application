"""
backend/services/match_service.py
=================================
Module 7: Semantic Match Scoring & Skill Gap Analysis.

Provides:
- Cosine similarity between resume and job embeddings
- Calibrated 0–100 Match Score (mapping SBERT dynamic range)
- Explainable skill gap detection with semantic synonym matching (e.g. JS vs JavaScript)
- Weighted blend of semantic SBERT score + explicit skill coverage
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from services.embedding_service import (
    compute_cosine_similarity,
    embed_text,
    embed_texts,
)

log = logging.getLogger("services.match")

# Calibration thresholds for semantic vector similarity
# Unrelated texts typically score < 0.15, relevant texts score >= 0.45
SIMILARITY_SCALE = 0.70

# Semantic similarity threshold to consider two skill names identical (e.g. JS & JavaScript)
SKILL_SYNONYM_THRESHOLD = 0.65


def calibrate_similarity_score(cosine_sim: float) -> float:
    """
    Calibrates raw cosine similarity (-1.0 to 1.0) into an intuitive 0–100 percentage score.
    Maps baseline noise <= 0.05 to 0%, scaling up to 100% at cosine similarity 0.70.
    """
    if cosine_sim <= 0.05:
        return 0.0
    normalized = (cosine_sim - 0.05) / (0.70 - 0.05)
    score = normalized * 100.0
    return max(0.0, min(100.0, round(score, 1)))


def extract_skills_from_text(text: str) -> List[str]:
    """
    Lightweight heuristic extractor to pull listed tech skills or comma-separated skills
    from required_skills or job descriptions.
    """
    if not text:
        return []

    # If already comma or pipe separated
    if "," in text or "|" in text:
        raw_items = re.split(r"[,|\n•\-\*]+", text)
        cleaned = [item.strip() for item in raw_items if item.strip() and len(item.strip()) < 40]
        if len(cleaned) >= 2:
            return list(dict.fromkeys(cleaned))

    # Pattern match common tech tokens
    pattern = (
        r"\b(Python|JavaScript|TypeScript|React|Next\.js|Node\.js|Vue|Angular|"
        r"FastAPI|Django|Flask|Docker|Kubernetes|AWS|GCP|Azure|PostgreSQL|MySQL|"
        r"MongoDB|Redis|GraphQL|REST|Git|CI/CD|Terraform|Linux|Java|Go|Rust|"
        r"C\+\+|SQL|NoSQL|Pandas|PyTorch|TensorFlow|Celery|Supabase)\b"
    )
    found = re.findall(pattern, text, re.IGNORECASE)
    # Deduplicate preserving original capitalization
    seen: Set[str] = set()
    result: List[str] = []
    for item in found:
        norm = item.lower()
        if norm not in seen:
            seen.add(norm)
            result.append(item)
    return result


# Common known acronym / alias dictionary for instantaneous exact mapping
COMMON_SKILL_ALIASES: Dict[str, Set[str]] = {
    "javascript": {"js", "ecmascript"},
    "typescript": {"ts"},
    "python": {"py", "python3"},
    "postgresql": {"postgres", "psql"},
    "amazon web services": {"aws"},
    "google cloud platform": {"gcp", "google cloud"},
    "microsoft azure": {"azure"},
    "docker": {"containerization", "containers"},
    "kubernetes": {"k8s"},
    "react": {"reactjs", "react.js"},
    "next.js": {"nextjs", "next"},
    "node.js": {"nodejs", "node"},
    "vue": {"vuejs", "vue.js"},
    "fastapi": {"fast-api"},
    "golang": {"go"},
    "machine learning": {"ml"},
    "artificial intelligence": {"ai"},
    "deep learning": {"dl"},
    "natural language processing": {"nlp"},
}


def are_skills_equivalent(skill_a: str, skill_b: str, emb_a: Optional[List[float]] = None, emb_b: Optional[List[float]] = None) -> bool:
    """
    Checks if two skill strings represent the same technical capability:
    1. Direct case-insensitive match
    2. Common alias dictionary check
    3. Sentence-BERT embedding similarity threshold (>= 0.65)
    """
    a_low = skill_a.strip().lower()
    b_low = skill_b.strip().lower()

    if a_low == b_low:
        return True

    # Check alias dictionary
    for canonical, aliases in COMMON_SKILL_ALIASES.items():
        all_forms = aliases | {canonical}
        if a_low in all_forms and b_low in all_forms:
            return True

    # If embeddings provided or computed, check semantic similarity
    if emb_a and emb_b:
        sim = compute_cosine_similarity(emb_a, emb_b)
        if sim >= SKILL_SYNONYM_THRESHOLD:
            return True

    return False


def identify_skill_gaps(
    candidate_skills: List[str],
    job_skills: List[str],
) -> Tuple[List[str], List[str]]:
    """
    Compares candidate skills against job requirements.
    Uses semantic synonym comparison so 'JS' matches 'JavaScript'.

    Returns:
        (matched_skills, missing_skills)
    """
    if not job_skills:
        return ([], [])

    if not candidate_skills:
        return ([], job_skills)

    # Pre-embed skills if needed for semantic matching
    cand_embs = embed_texts(candidate_skills) if len(candidate_skills) > 0 else []
    job_embs = embed_texts(job_skills) if len(job_skills) > 0 else []

    matched: List[str] = []
    missing: List[str] = []

    for j_idx, j_skill in enumerate(job_skills):
        j_emb = job_embs[j_idx] if j_idx < len(job_embs) else None
        is_matched = False

        for c_idx, c_skill in enumerate(candidate_skills):
            c_emb = cand_embs[c_idx] if c_idx < len(cand_embs) else None
            if are_skills_equivalent(c_skill, j_skill, c_emb, j_emb):
                is_matched = True
                break

        if is_matched:
            matched.append(j_skill)
        else:
            missing.append(j_skill)

    return (matched, missing)


def compute_match_score(
    resume_text: str,
    job_description: str,
    resume_embedding: Optional[List[float]] = None,
    job_embedding: Optional[List[float]] = None,
    job_required_skills: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Calculates overall match analytics between candidate resume and job posting:
    - Cosine similarity between 384-d dense embeddings
    - Calibrated 0–100 match percentage
    - Missing skills list for explainable gap analysis
    - Matched skills list
    """
    if not resume_text and not resume_embedding:
        return {
            "match_score": 0.0,
            "cosine_similarity": 0.0,
            "missing_skills": [],
            "matched_skills": [],
            "skill_coverage_pct": 0.0,
        }

    # Get or generate embeddings
    r_emb = resume_embedding or embed_text(resume_text)
    j_emb = job_embedding or embed_text(job_description)

    raw_cosine = compute_cosine_similarity(r_emb, j_emb)
    semantic_score = calibrate_similarity_score(raw_cosine)

    # Skill extraction & gap analysis
    candidate_skills = extract_skills_from_text(resume_text)
    jd_skills = extract_skills_from_text(job_required_skills or job_description)

    matched_skills, missing_skills = identify_skill_gaps(candidate_skills, jd_skills)

    skill_coverage_pct = 100.0
    if jd_skills:
        skill_coverage_pct = round((len(matched_skills) / len(jd_skills)) * 100.0, 1)
        # Blend: 60% semantic similarity + 40% explicit skill coverage
        final_score = round(0.60 * semantic_score + 0.40 * skill_coverage_pct, 1)
    else:
        final_score = round(semantic_score, 1)

    return {
        "match_score": max(0.0, min(100.0, final_score)),
        "cosine_similarity": round(raw_cosine, 4),
        "missing_skills": missing_skills,
        "matched_skills": matched_skills,
        "skill_coverage_pct": skill_coverage_pct,
    }

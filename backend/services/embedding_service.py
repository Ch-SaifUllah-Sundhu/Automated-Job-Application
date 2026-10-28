"""
backend/services/embedding_service.py
=====================================
Module 7: Dense vector embedding service using Sentence-BERT (all-MiniLM-L6-v2).

Features:
- Singleton SentenceTransformer instance (384 dimensions)
- Text chunking for resumes and job descriptions (avoids token truncation)
- Mean-pooled and unit-normalized dense embeddings for pgvector compatibility
- Fast cosine similarity computation (pure vector dot product)
- Resilient fallback if the heavy model is still loading or offline
"""

from __future__ import annotations

import logging
import math
import re
from typing import Any, List, Optional

log = logging.getLogger("services.embedding")

# Model configuration
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
MAX_CHUNK_CHARS = 600
CHUNK_OVERLAP_CHARS = 100

_model: Any = None
_model_failed = False


def get_embedding_model() -> Any:
    """
    Lazy singleton loader for the Sentence-BERT embedding model.
    Loads once on demand to prevent slowing down application cold starts.
    """
    global _model, _model_failed
    if _model is not None:
        return _model
    if _model_failed:
        return None

    try:
        from sentence_transformers import SentenceTransformer

        log.info("Loading Sentence-BERT model '%s' (dim=%d)...", EMBEDDING_MODEL_NAME, EMBEDDING_DIM)
        try:
            _model = SentenceTransformer(EMBEDDING_MODEL_NAME, local_files_only=True)
        except Exception:
            _model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        log.info("Sentence-BERT model loaded successfully.")
        return _model
    except Exception as exc:  # noqa: BLE001
        log.warning("Could not load Sentence-BERT model '%s': %s. Falling back to deterministic vectorizer.", EMBEDDING_MODEL_NAME, exc)
        _model_failed = True
        return None


def chunk_text(text: str, max_chars: int = MAX_CHUNK_CHARS, overlap: int = CHUNK_OVERLAP_CHARS) -> List[str]:
    """
    Splits long resume or job description text into coherent chunks by paragraphs
    or sentences, preventing context window truncation.
    """
    if not text or not text.strip():
        return []

    cleaned = text.strip()
    # If text is already within reasonable length, return as single chunk
    if len(cleaned) <= max_chars:
        return [cleaned]

    # Split primarily on double newlines (paragraphs/sections)
    raw_paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", cleaned) if p.strip()]
    chunks: List[str] = []
    current_chunk = ""

    for para in raw_paragraphs:
        if len(para) > max_chars:
            # Paragraph itself is too large — split into sentences
            sentences = re.split(r"(?<=[.!?])\s+", para)
            for sentence in sentences:
                if len(current_chunk) + len(sentence) + 1 <= max_chars:
                    current_chunk = f"{current_chunk} {sentence}".strip()
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                    current_chunk = sentence
        else:
            if len(current_chunk) + len(para) + 1 <= max_chars:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks if chunks else [cleaned[:max_chars]]


def _normalize_vector(vec: List[float]) -> List[float]:
    """Unit-normalizes a float vector (L2 norm = 1.0)."""
    norm = math.sqrt(sum(x * x for x in vec))
    if norm < 1e-9:
        return [0.0] * len(vec)
    return [round(x / norm, 6) for x in vec]


def _deterministic_fallback_vector(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    Generates a deterministic pseudo-semantic 384-d normalized vector
    when Sentence-BERT is not installed or loading. Ensures zero-downtime testability.
    """
    import hashlib

    words = re.findall(r"\w+", text.lower())
    vec = [0.0] * dim
    for word in words:
        digest = hashlib.sha256(word.encode("utf-8")).digest()
        for i in range(min(dim, len(digest))):
            vec[i] += float(digest[i] - 128)
    return _normalize_vector(vec)


def embed_text(text: str) -> List[float]:
    """
    Encodes arbitrary text into a 384-dimensional dense vector.
    For longer texts (like a full resume), breaks into chunks, embeds each,
    and returns the mean-pooled, unit-normalized representation.
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIM

    model = get_embedding_model()
    if model is None:
        return _deterministic_fallback_vector(text, EMBEDDING_DIM)

    chunks = chunk_text(text)
    if not chunks:
        chunks = [text[:MAX_CHUNK_CHARS]]

    try:
        # Encode chunks with L2 normalization enabled
        embeddings = model.encode(chunks, normalize_embeddings=True)
        # If single chunk, convert to list directly
        if len(chunks) == 1:
            return [round(float(v), 6) for v in embeddings[0]]

        # Mean pooling across chunk embeddings
        mean_vec = [0.0] * EMBEDDING_DIM
        for chunk_emb in embeddings:
            for idx, val in enumerate(chunk_emb):
                mean_vec[idx] += float(val)
        mean_vec = [v / len(chunks) for v in mean_vec]
        return _normalize_vector(mean_vec)
    except Exception as exc:  # noqa: BLE001
        log.error("Embedding generation failed: %s", exc)
        return _deterministic_fallback_vector(text, EMBEDDING_DIM)


def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Batch encodes multiple short texts (e.g. skills or titles).
    """
    if not texts:
        return []

    model = get_embedding_model()
    if model is None:
        return [_deterministic_fallback_vector(t, EMBEDDING_DIM) for t in texts]

    try:
        embeddings = model.encode(texts, normalize_embeddings=True)
        return [[round(float(v), 6) for v in emb] for emb in embeddings]
    except Exception as exc:  # noqa: BLE001
        log.error("Batch embedding generation failed: %s", exc)
        return [_deterministic_fallback_vector(t, EMBEDDING_DIM) for t in texts]


def compute_cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """
    Calculates cosine similarity between two float vectors.
    Assumes vectors are unit-normalized; computes dot product.
    Returns float in range [-1.0, 1.0].
    """
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    return max(-1.0, min(1.0, dot))

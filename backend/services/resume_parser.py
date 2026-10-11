"""
backend/services/resume_parser.py
=================================
Extracts plain text from resume files (PDF and DOCX).
Used during profile setup and document upload.
"""

from __future__ import annotations

import io
import logging
import re
from typing import BinaryIO

from docx import Document
from pdfminer.high_level import extract_text as extract_pdf_text

log = logging.getLogger("resume_parser")


def clean_extracted_text(text: str) -> str:
    """Normalize whitespace and strip non-printable characters."""
    if not text:
        return ""
    # Normalize carriage returns and repeated blank lines
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_pdf(file_bytes: bytes | BinaryIO) -> str:
    """Extract text from a PDF file."""
    try:
        stream = io.BytesIO(file_bytes) if isinstance(file_bytes, bytes) else file_bytes
        text = extract_pdf_text(stream)
        return clean_extracted_text(text)
    except Exception as exc:
        log.error("Failed to parse PDF resume: %s", exc)
        raise ValueError(f"Could not parse PDF file: {exc}") from exc


def parse_docx(file_bytes: bytes | BinaryIO) -> str:
    """Extract text from a DOCX file."""
    try:
        stream = io.BytesIO(file_bytes) if isinstance(file_bytes, bytes) else file_bytes
        doc = Document(stream)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        # Also include any table content
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        return clean_extracted_text("\n".join(paragraphs))
    except Exception as exc:
        log.error("Failed to parse DOCX resume: %s", exc)
        raise ValueError(f"Could not parse DOCX file: {exc}") from exc


def parse_resume(file_bytes: bytes, filename: str) -> str:
    """
    Parses resume content from PDF or DOCX format based on file extension.
    """
    lower_name = filename.lower()
    if lower_name.endswith(".pdf"):
        return parse_pdf(file_bytes)
    elif lower_name.endswith((".docx", ".doc")):
        return parse_docx(file_bytes)
    elif lower_name.endswith(".txt"):
        return clean_extracted_text(file_bytes.decode("utf-8", errors="ignore"))
    else:
        raise ValueError("Unsupported resume format. Please upload a PDF, DOCX, or TXT file.")

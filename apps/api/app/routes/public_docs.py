"""Public documentation routes — no authentication required.

Exposes the project docs/ directory as HTTP endpoints so agents (and humans)
can read operational manuals without logging in.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/public", tags=["public-docs"])

DOCS_ROOT = Path(__file__).resolve().parents[4] / "docs"


class DocFile(BaseModel):
    category: str
    name: str
    title: str


class DocListResponse(BaseModel):
    categories: list[str]
    files: list[DocFile]


class DocContentResponse(BaseModel):
    category: str
    name: str
    title: str
    content: str


def _extract_title(content: str) -> str:
    """Pull the first H1 from markdown as the document title."""
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return "Untitled"


def _safe_doc_path(category: str, filename: str) -> Path:
    """Resolve and validate that the requested file lives inside docs/."""
    requested = (DOCS_ROOT / category / filename).resolve()
    if not str(requested).startswith(str(DOCS_ROOT.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    return requested


@router.get("/docs", response_model=DocListResponse)
def list_docs() -> DocListResponse:
    """List all available public documentation files."""
    categories: list[str] = []
    files: list[DocFile] = []

    if DOCS_ROOT.exists():
        for category_dir in sorted(DOCS_ROOT.iterdir()):
            if category_dir.is_dir():
                category = category_dir.name
                categories.append(category)
                for doc_file in sorted(category_dir.glob("*.md")):
                    content = doc_file.read_text(encoding="utf-8")
                    files.append(
                        DocFile(
                            category=category,
                            name=doc_file.stem,
                            title=_extract_title(content),
                        )
                    )

    return DocListResponse(categories=categories, files=files)


@router.get("/docs/{category}/{filename}", response_model=DocContentResponse)
def get_doc(category: str, filename: str) -> DocContentResponse:
    """Fetch the raw Markdown content of a specific document.

    Example: GET /api/public/docs/guides/agent-quickstart
    """
    # Sanitize — only allow alphanumerics, hyphens, underscores
    if not all(c.isalnum() or c in "-_" for c in category):
        raise HTTPException(status_code=400, detail="Invalid category")
    if not all(c.isalnum() or c in "-_" for c in filename):
        raise HTTPException(status_code=400, detail="Invalid filename")

    doc_path = _safe_doc_path(category, f"{filename}.md")

    if not doc_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")

    content = doc_path.read_text(encoding="utf-8")
    return DocContentResponse(
        category=category,
        name=filename,
        title=_extract_title(content),
        content=content,
    )

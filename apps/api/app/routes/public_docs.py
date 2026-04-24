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
_DEFAULT_PUBLIC_DOC_CATEGORIES = ("guides",)


def _resolve_docs_root(module_file: Path | None = None, cwd: Path | None = None) -> Path:
    """Locate the public docs directory in both source-tree and installed-package layouts."""
    module_path = (module_file or Path(__file__)).resolve()
    working_dir = (cwd or Path.cwd()).resolve()

    candidates: list[Path] = []
    env_root = os.environ.get("PUBLIC_DOCS_ROOT")
    if env_root:
        candidates.append(Path(env_root).expanduser().resolve())

    candidates.append((working_dir / "docs").resolve())
    for parent in module_path.parents:
        candidates.append((parent / "docs").resolve())

    seen: set[Path] = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.exists() and candidate.is_dir():
            return candidate

    return (working_dir / "docs").resolve()


def _get_public_categories() -> tuple[str, ...]:
    raw_value = os.environ.get("PUBLIC_DOCS_CATEGORIES")
    if raw_value is None:
        return _DEFAULT_PUBLIC_DOC_CATEGORIES

    categories: list[str] = []
    seen: set[str] = set()
    for item in raw_value.split(","):
        category = item.strip()
        if not category or category in seen:
            continue
        if not all(char.isalnum() or char in "-_" for char in category):
            continue
        seen.add(category)
        categories.append(category)

    return tuple(categories or _DEFAULT_PUBLIC_DOC_CATEGORIES)


DOCS_ROOT = _resolve_docs_root()


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
    docs_root = DOCS_ROOT.resolve()
    requested = (docs_root / category / filename).resolve()
    if not requested.is_relative_to(docs_root):
        raise HTTPException(status_code=400, detail="Invalid path")
    return requested


@router.get("/docs", response_model=DocListResponse)
def list_docs() -> DocListResponse:
    """List all available public documentation files."""
    categories: list[str] = []
    files: list[DocFile] = []

    if DOCS_ROOT.exists():
        docs_root = DOCS_ROOT.resolve()
        for category in _get_public_categories():
            category_dir = DOCS_ROOT / category
            if not category_dir.is_dir():
                continue
            if not category_dir.resolve().is_relative_to(docs_root):
                continue
            categories.append(category)
            for doc_file in sorted(category_dir.glob("*.md")):
                if not doc_file.resolve().is_relative_to(docs_root):
                    continue
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
    if category not in _get_public_categories():
        raise HTTPException(status_code=404, detail="Document not found")

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

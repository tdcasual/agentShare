"""Shared datetime helpers."""
from __future__ import annotations

from datetime import UTC, datetime


def as_utc(value: datetime) -> datetime:
    """Normalize a datetime to UTC, treating naive values as UTC.

    SQLite drops tzinfo on read, so values round-tripped through the database
    may be naive even though the application always writes UTC.
    """
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)

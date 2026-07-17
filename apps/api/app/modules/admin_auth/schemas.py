from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator

MAX_BCRYPT_PASSWORD_BYTES = 72


def _validate_bcrypt_password_length(value: str) -> str:
    if len(value.encode("utf-8")) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError(f"Password must not exceed {MAX_BCRYPT_PASSWORD_BYTES} UTF-8 bytes")
    return value


class BootstrapRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=12, max_length=1024)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]:
            raise ValueError("Invalid email format")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        _validate_bcrypt_password_length(value)
        required_patterns = (r"[a-z]", r"[A-Z]", r"\d", r"[^A-Za-z0-9]")
        if not all(re.search(pattern, value) for pattern in required_patterns):
            raise ValueError("Password must contain upper, lower, digit, and special characters")
        return value


class LoginRequest(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=1024)

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        return _validate_bcrypt_password_length(value)


class ManagementTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    ttl_seconds: int | None = Field(default=None, ge=60, le=31_536_000)

from __future__ import annotations

import hashlib


def hash_openclaw_session_key(session_key: str) -> str:
    return hashlib.sha256(session_key.encode()).hexdigest()

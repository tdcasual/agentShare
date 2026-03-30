"""selector based capability access policy

Revision ID: 20260330_02
Revises: 20260330_01
Create Date: 2026-03-30 00:30:00.000000
"""
from __future__ import annotations

import json

import sqlalchemy as sa
from alembic import op


revision = "20260330_02"
down_revision = "20260330_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("capabilities"):
        return

    columns = {column["name"] for column in inspector.get_columns("capabilities")}
    if "access_policy" not in columns:
        return

    rows = bind.execute(sa.text("SELECT id, access_policy FROM capabilities")).all()
    for capability_id, raw_policy in rows:
        normalized = _normalize_access_policy(raw_policy)
        bind.execute(
            sa.text(
                """
                UPDATE capabilities
                SET access_policy = :access_policy
                WHERE id = :capability_id
                """
            ),
            {
                "capability_id": capability_id,
                "access_policy": json.dumps(normalized),
            },
        )


def downgrade() -> None:
    return None


def _normalize_access_policy(raw_policy) -> dict:
    policy = _coerce_json_object(raw_policy)
    mode = policy.get("mode")

    if mode == "explicit_tokens":
        token_ids = _dedupe_strings(policy.get("token_ids", []))
        if not token_ids:
            return {"mode": "all_tokens", "selectors": []}
        return {
            "mode": "selectors",
            "selectors": [
                {"kind": "token", "ids": token_ids},
            ],
        }

    if mode == "selectors":
        selectors: list[dict] = []
        for selector in policy.get("selectors", []):
            if not isinstance(selector, dict):
                continue
            kind = selector.get("kind")
            if kind in {"token", "agent"}:
                ids = _dedupe_strings(selector.get("ids", []))
                if ids:
                    selectors.append({"kind": kind, "ids": ids})
                continue
            if kind == "token_label":
                key = selector.get("key")
                values = _dedupe_strings(selector.get("values", []))
                if key and values:
                    selectors.append({"kind": "token_label", "key": key, "values": values})
        if not selectors:
            return {"mode": "all_tokens", "selectors": []}
        return {"mode": "selectors", "selectors": selectors}

    return {"mode": "all_tokens", "selectors": []}


def _coerce_json_object(raw_policy) -> dict:
    if raw_policy in (None, "", {}):
        return {}
    if isinstance(raw_policy, dict):
        return raw_policy
    if isinstance(raw_policy, (bytes, bytearray)):
        raw_policy = raw_policy.decode()
    if isinstance(raw_policy, str):
        raw_policy = raw_policy.strip()
        if not raw_policy:
            return {}
        try:
            parsed = json.loads(raw_policy)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _dedupe_strings(values) -> list[str]:
    if not isinstance(values, list):
        return []
    return list(dict.fromkeys(value for value in values if isinstance(value, str) and value))

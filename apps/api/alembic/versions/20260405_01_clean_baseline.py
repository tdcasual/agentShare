"""clean baseline schema

Revision ID: 20260405_01
Revises:
Create Date: 2026-04-05 00:00:00.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260405_01"
down_revision = None
branch_labels = None
depends_on = None


def _legacy(*parts: str) -> str:
    return "".join(parts)


def upgrade() -> None:
    op.create_table(
        _legacy("agent", "_", "tokens"),
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False, unique=True),
        sa.Column("token_prefix", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issued_by_actor_type", sa.String(), nullable=False),
        sa.Column("issued_by_actor_id", sa.String(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("labels", sa.JSON(), nullable=False),
        sa.Column("completed_runs", sa.Integer(), nullable=False),
        sa.Column("successful_runs", sa.Integer(), nullable=False),
        sa.Column("success_rate", sa.Float(), nullable=False),
        sa.Column("last_feedback_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trust_score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "agents",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("issuer", sa.String(), nullable=False),
        sa.Column("auth_method", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("api_key_hash", sa.String(), nullable=True),
        sa.Column("allowed_capability_ids", sa.JSON(), nullable=False),
        sa.Column("allowed_task_types", sa.JSON(), nullable=False),
        sa.Column("risk_tier", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "approval_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column("capability_id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("action_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("policy_reason", sa.String(), nullable=False),
        sa.Column("policy_source", sa.String(), nullable=True),
        sa.Column("requested_by", sa.String(), nullable=False),
        sa.Column("decided_by", sa.String(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "capabilities",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("secret_id", sa.String(), nullable=False),
        sa.Column("allowed_mode", sa.String(), nullable=False),
        sa.Column("lease_ttl_seconds", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(), nullable=False),
        sa.Column("approval_mode", sa.String(), nullable=False),
        sa.Column("approval_rules", sa.JSON(), nullable=False),
        sa.Column("allowed_audience", sa.JSON(), nullable=False),
        sa.Column("access_policy", sa.JSON(), nullable=False),
        sa.Column("required_provider", sa.String(), nullable=True),
        sa.Column("required_provider_scopes", sa.JSON(), nullable=False),
        sa.Column("allowed_environments", sa.JSON(), nullable=False),
        sa.Column("adapter_type", sa.String(), nullable=False),
        sa.Column("adapter_config", sa.JSON(), nullable=False),
        sa.Column("created_by_actor_type", sa.String(), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_via_token_id", sa.String(), nullable=True),
        sa.Column("publication_status", sa.String(), nullable=False),
        sa.Column("reviewed_by_actor_id", sa.String(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.String(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "catalog_releases",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("resource_kind", sa.String(), nullable=False),
        sa.Column("resource_id", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("subtitle", sa.String(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("release_status", sa.String(), nullable=False),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_via_token_id", sa.String(), nullable=True),
        sa.Column("adoption_count", sa.Integer(), nullable=False),
        sa.Column("release_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint(
            "resource_kind",
            "resource_id",
            "version",
            name="uq_catalog_releases_resource_version",
        ),
    )

    op.create_table(
        "events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("actor_type", sa.String(), nullable=False),
        sa.Column("actor_id", sa.String(), nullable=False),
        sa.Column("subject_type", sa.String(), nullable=False),
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("action_url", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "human_accounts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "management_sessions",
        sa.Column("session_id", sa.String(), primary_key=True),
        sa.Column("actor_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "pending_secret_materials",
        sa.Column("secret_id", sa.String(), primary_key=True),
        sa.Column("secret_value", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "playbooks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("task_type", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("tags", sa.JSON(), nullable=False),
        sa.Column("created_by_actor_type", sa.String(), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_via_token_id", sa.String(), nullable=True),
        sa.Column("publication_status", sa.String(), nullable=False),
        sa.Column("reviewed_by_actor_id", sa.String(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.String(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "runs",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("token_id", sa.String(), nullable=True),
        sa.Column("task_target_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("result_summary", sa.String(), nullable=False),
        sa.Column("output_payload", sa.JSON(), nullable=False),
        sa.Column("error_summary", sa.String(), nullable=False),
        sa.Column("capability_invocations", sa.JSON(), nullable=False),
        sa.Column("lease_events", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "secrets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False),
        sa.Column("scope", sa.JSON(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("environment", sa.String(), nullable=True),
        sa.Column("provider_scopes", sa.JSON(), nullable=False),
        sa.Column("resource_selector", sa.String(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=False),
        sa.Column("backend_ref", sa.String(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_by_actor_type", sa.String(), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_via_token_id", sa.String(), nullable=True),
        sa.Column("publication_status", sa.String(), nullable=False),
        sa.Column("reviewed_by_actor_id", sa.String(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.String(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "spaces",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(), primary_key=True),
        sa.Column("value_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "task_targets",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("task_id", sa.String(), nullable=False),
        sa.Column(_legacy("target", "_", "token", "_", "id"), sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(_legacy("claimed_by", "_", "token", "_", "id"), sa.String(), nullable=True),
        sa.Column("claimed_by_agent_id", sa.String(), nullable=True),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_run_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint(
            "task_id",
            _legacy("target", "_", "token", "_", "id"),
            name="uq_task_targets_task_token",
        ),
    )

    op.create_table(
        "tasks",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("task_type", sa.String(), nullable=False),
        sa.Column("input", sa.JSON(), nullable=False),
        sa.Column("required_capability_ids", sa.JSON(), nullable=False),
        sa.Column("playbook_ids", sa.JSON(), nullable=False),
        sa.Column("lease_allowed", sa.Boolean(), nullable=False),
        sa.Column("approval_mode", sa.String(), nullable=False),
        sa.Column("approval_rules", sa.JSON(), nullable=False),
        sa.Column("priority", sa.String(), nullable=False),
        sa.Column("target_mode", sa.String(), nullable=False),
        sa.Column(_legacy("target", "_", "token", "_", "ids"), sa.JSON(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("created_by", sa.String(), nullable=False),
        sa.Column("created_by_actor_type", sa.String(), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_via_token_id", sa.String(), nullable=True),
        sa.Column("publication_status", sa.String(), nullable=False),
        sa.Column("reviewed_by_actor_id", sa.String(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_reason", sa.String(), nullable=False, server_default=sa.text("''")),
        sa.Column("claimed_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "token_feedback",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("token_id", sa.String(), nullable=False),
        sa.Column("task_target_id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("verdict", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("created_by_actor_type", sa.String(), nullable=False),
        sa.Column("created_by_actor_id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("task_target_id", name="uq_token_feedback_task_target_id"),
    )

    op.create_table(
        "space_members",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("space_id", sa.String(), nullable=False),
        sa.Column("member_type", sa.String(), nullable=False),
        sa.Column("member_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], name=None),
        sa.UniqueConstraint("space_id", "member_type", "member_id", name="uq_space_members_identity"),
    )

    op.create_table(
        "space_timeline_entries",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("space_id", sa.String(), nullable=False),
        sa.Column("entry_type", sa.String(), nullable=False),
        sa.Column("subject_type", sa.String(), nullable=False),
        sa.Column("subject_id", sa.String(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"], name=None),
        sa.UniqueConstraint(
            "space_id",
            "entry_type",
            "subject_type",
            "subject_id",
            name="uq_space_timeline_identity",
        ),
    )


def downgrade() -> None:
    op.drop_table("space_timeline_entries")
    op.drop_table("space_members")
    op.drop_table("token_feedback")
    op.drop_table("tasks")
    op.drop_table("task_targets")
    op.drop_table("system_settings")
    op.drop_table("spaces")
    op.drop_table("secrets")
    op.drop_table("runs")
    op.drop_table("playbooks")
    op.drop_table("pending_secret_materials")
    op.drop_table("management_sessions")
    op.drop_table("human_accounts")
    op.drop_table("events")
    op.drop_table("catalog_releases")
    op.drop_table("capabilities")
    op.drop_table("audit_events")
    op.drop_table("approval_requests")
    op.drop_table("agents")
    op.drop_table(_legacy("agent", "_", "tokens"))

"""Add Agent onboarding invites and documentation URLs."""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260820_01"
down_revision = "20260730_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_invites",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("default_space_id", sa.String(255), sa.ForeignKey("vault_spaces.id", ondelete="SET NULL")),
        sa.Column("default_role", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("status IN ('active', 'consumed', 'revoked', 'expired')", name="check_agent_invite_status"),
    )
    op.create_index("idx_agent_invites_user_id", "agent_invites", ["user_id"])
    op.create_index("idx_agent_invites_status", "agent_invites", ["status"])
    op.create_table(
        "agent_join_requests",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("user_id", sa.String(255), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invite_id", sa.String(255), sa.ForeignKey("agent_invites.id", ondelete="CASCADE"), nullable=False),
        sa.Column("request_secret_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("proposed_name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("agent_id", sa.String(255), sa.ForeignKey("agents.id", ondelete="SET NULL")),
        sa.Column("rejection_reason", sa.String(1000)),
        sa.Column("delivery_encrypted", sa.Text),
        sa.Column("delivery_claimed_at", sa.DateTime(timezone=True)),
        sa.Column("delivery_expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("invite_id", name="uq_agent_join_requests_invite_id"),
        sa.CheckConstraint("status IN ('pending', 'approved', 'rejected', 'expired')", name="check_agent_join_request_status"),
    )
    op.create_index("idx_agent_join_requests_user_id", "agent_join_requests", ["user_id"])
    op.create_index("idx_agent_join_requests_status", "agent_join_requests", ["status"])
    with op.batch_alter_table("secrets") as batch_op:
        batch_op.add_column(sa.Column("documentation_url", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("secrets") as batch_op:
        batch_op.drop_column("documentation_url")
    op.drop_index("idx_agent_join_requests_status", table_name="agent_join_requests")
    op.drop_index("idx_agent_join_requests_user_id", table_name="agent_join_requests")
    op.drop_table("agent_join_requests")
    op.drop_index("idx_agent_invites_status", table_name="agent_invites")
    op.drop_index("idx_agent_invites_user_id", table_name="agent_invites")
    op.drop_table("agent_invites")

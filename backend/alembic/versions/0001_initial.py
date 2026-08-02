"""Initial schema: users and entries tables.

Revision ID: 0001
Revises:
Create Date: 2026-08-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "users" not in existing:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if "entries" not in existing:
        op.create_table(
            "entries",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column(
                "type",
                sa.Enum("feed", "sleep", "diaper", name="entrytype"),
                nullable=False,
            ),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("details", postgresql.JSONB(), nullable=False),
            sa.Column("note", sa.String(length=1000), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )
        op.create_index("ix_entries_user_id", "entries", ["user_id"])
        op.create_index("ix_entries_type", "entries", ["type"])
        op.create_index("ix_entries_started_at", "entries", ["started_at"])


def downgrade() -> None:
    bind = op.get_bind()
    existing = set(sa.inspect(bind).get_table_names())

    if "entries" in existing:
        op.drop_table("entries")
    if "users" in existing:
        op.drop_table("users")
    sa.Enum(name="entrytype").drop(bind, checkfirst=True)

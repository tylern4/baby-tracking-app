"""Add roles and approval status to users.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-02

Existing users are pre-approved (status = active) and promoted to admin so the
owner retains the ability to approve future signups.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "users" not in tables:
        return
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}

    if "role" not in cols:
        role_enum = sa.Enum("admin", "user", "read_only", name="userrole")
        role_enum.create(bind, checkfirst=True)
        op.add_column(
            "users",
            sa.Column("role", role_enum, nullable=False, server_default="user"),
        )
    if "status" not in cols:
        status_enum = sa.Enum("pending", "active", "denied", name="userstatus")
        status_enum.create(bind, checkfirst=True)
        op.add_column(
            "users",
            sa.Column("status", status_enum, nullable=False, server_default="pending"),
        )

    op.execute("UPDATE users SET status = 'active', role = 'admin'")

    op.alter_column("users", "role", server_default=None)
    op.alter_column("users", "status", server_default=None)


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "users" not in tables:
        return
    cols = {c["name"] for c in sa.inspect(bind).get_columns("users")}
    if "status" in cols:
        op.drop_column("users", "status")
    if "role" in cols:
        op.drop_column("users", "role")
    sa.Enum(name="userstatus").drop(bind, checkfirst=True)
    sa.Enum(name="userrole").drop(bind, checkfirst=True)

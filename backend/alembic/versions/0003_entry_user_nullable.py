"""Keep entries when a user is deleted.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-02

Entries belong to the family, not to the account that logged them. When a user
is deleted their entries are preserved and the attribution (user_id) is set to
NULL via ON DELETE SET NULL.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "entries" not in tables:
        return
    cols = {c["name"] for c in sa.inspect(bind).get_columns("entries")}
    if "user_id" not in cols:
        return

    op.drop_constraint("entries_user_id_fkey", "entries", type_="foreignkey")
    op.alter_column("entries", "user_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        "entries_user_id_fkey",
        "entries",
        "users",
        ["user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    if "entries" not in tables:
        return
    cols = {c["name"] for c in sa.inspect(bind).get_columns("entries")}
    if "user_id" not in cols:
        return

    op.drop_constraint("entries_user_id_fkey", "entries", type_="foreignkey")
    op.alter_column("entries", "user_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        "entries_user_id_fkey",
        "entries",
        "users",
        ["user_id"],
        ["id"],
    )

"""wave0 backfill: mark legacy demo/test rows (PLI-GW0)

Rows created before the is_demo/is_internal flags existed default to false.
Demo seed accounts (@pli.demo) and synthetic test accounts (@pli.test) must
be excluded from real pilot metrics (W0 §6). Idempotent; re-runnable safely.

Revision ID: c4d8e2a71b93
Revises: 48f7e9c2ab01
Create Date: 2026-09-18 19:30:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "c4d8e2a71b93"
down_revision: Union[str, None] = "48f7e9c2ab01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET is_demo = TRUE WHERE email LIKE '%@pli.demo'")
    op.execute("UPDATE users SET is_internal = TRUE WHERE email LIKE '%@pli.test'")
    op.execute(
        "UPDATE pets SET is_demo = TRUE WHERE created_by_user_id IN "
        "(SELECT id FROM users WHERE email LIKE '%@pli.demo')"
    )
    op.execute(
        "UPDATE pets SET is_internal = TRUE WHERE created_by_user_id IN "
        "(SELECT id FROM users WHERE email LIKE '%@pli.test')"
    )


def downgrade() -> None:
    op.execute("UPDATE users SET is_demo = FALSE WHERE email LIKE '%@pli.demo'")
    op.execute("UPDATE users SET is_internal = FALSE WHERE email LIKE '%@pli.test'")
    op.execute(
        "UPDATE pets SET is_demo = FALSE WHERE created_by_user_id IN "
        "(SELECT id FROM users WHERE email LIKE '%@pli.demo')"
    )
    op.execute(
        "UPDATE pets SET is_internal = FALSE WHERE created_by_user_id IN "
        "(SELECT id FROM users WHERE email LIKE '%@pli.test')"
    )

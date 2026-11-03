"""R8AG persist immutable source-comparison membership at Case creation.

Revision ID: f1e2d3c4b5a6
Revises: c8d8e1a4b301
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f1e2d3c4b5a6"
down_revision: Union[str, None] = "c8d8e1a4b301"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Do NOT fabricate a historical source-role snapshot for old Cases.
    op.add_column(
        "life_change_cases",
        sa.Column("evidence_role_by_event_id", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("life_change_cases", "evidence_role_by_event_id")

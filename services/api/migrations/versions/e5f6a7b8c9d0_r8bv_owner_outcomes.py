"""R8BV append-only owner outcomes anchored to real follow-up observations.

Revision ID: e5f6a7b8c9d0
Revises: d4f5e6a7b8c9
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4f5e6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "life_change_outcomes",
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("life_change_cases.id"), nullable=False),
        sa.Column("pet_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pets.id"), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("observation_review_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("life_change_reviews.id"), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("assessment", sa.String(length=40), nullable=False),
        sa.Column("note", sa.String(length=240), nullable=False, server_default=""),
        sa.Column("prior_outcome_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("idempotency_key", sa.String(length=96), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("case_id", "actor_id", "idempotency_key", name="uq_life_change_outcome_idempotency"),
    )
    op.create_index(
        "ix_life_change_outcome_case_time",
        "life_change_outcomes",
        ["case_id", "recorded_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_life_change_outcome_case_time", table_name="life_change_outcomes")
    op.drop_table("life_change_outcomes")

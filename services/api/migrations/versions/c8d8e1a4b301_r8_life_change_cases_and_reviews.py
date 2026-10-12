"""R8 accountable life-change case and append-only owner review.

Revision ID: c8d8e1a4b301
Revises: b2c3d4e5f6a7
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c8d8e1a4b301"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "life_change_cases",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("pet_id", sa.UUID(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=False),
        sa.Column("metric", sa.String(length=50), nullable=False),
        sa.Column("insight_kind", sa.String(length=30), nullable=False),
        sa.Column("algorithm_version", sa.String(length=40), nullable=False),
        sa.Column("fingerprint", sa.String(length=64), nullable=False),
        sa.Column("computed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("knowledge_cutoff", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone_policy", sa.String(length=40), nullable=False),
        sa.Column("current_value", sa.Float(), nullable=False),
        sa.Column("baseline_value", sa.Float(), nullable=False),
        sa.Column("sample_days", sa.Integer(), nullable=False),
        sa.Column("window_days", sa.Integer(), nullable=False),
        sa.Column("evidence_event_ids", postgresql.JSONB(), nullable=False),
        sa.Column("source_scope", sa.String(length=40), nullable=False),
        sa.Column("uncertainty", sa.Text(), nullable=False),
        sa.Column("human_question", sa.String(length=240), nullable=False),
        sa.Column("state", sa.String(length=30), nullable=False),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"], name=op.f("fk_life_change_cases_pet_id_pets")),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"], ["users.id"],
            name=op.f("fk_life_change_cases_created_by_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_life_change_cases")),
        sa.UniqueConstraint("pet_id", "fingerprint", name="uq_life_change_case_fingerprint"),
    )
    op.create_index(
        "ix_life_change_case_pet_created", "life_change_cases",
        ["pet_id", "created_at"], unique=False,
    )
    op.create_table(
        "life_change_reviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("case_id", sa.UUID(), nullable=False),
        sa.Column("pet_id", sa.UUID(), nullable=False),
        sa.Column("actor_id", sa.UUID(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decision", sa.String(length=32), nullable=False),
        sa.Column("note", sa.String(length=240), nullable=False),
        sa.Column("related_event_ids", postgresql.JSONB(), nullable=False),
        sa.Column("related_task_id", sa.UUID(), nullable=True),
        sa.Column("prior_review_id", sa.UUID(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=96), nullable=True),
        sa.ForeignKeyConstraint(["case_id"], ["life_change_cases.id"], name=op.f("fk_life_change_reviews_case_id_life_change_cases")),
        sa.ForeignKeyConstraint(["pet_id"], ["pets.id"], name=op.f("fk_life_change_reviews_pet_id_pets")),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], name=op.f("fk_life_change_reviews_actor_id_users")),
        sa.ForeignKeyConstraint(["related_task_id"], ["care_tasks.id"], name=op.f("fk_life_change_reviews_related_task_id_care_tasks")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_life_change_reviews")),
        sa.UniqueConstraint(
            "case_id", "actor_id", "idempotency_key",
            name="uq_life_change_review_idempotency",
        ),
    )
    op.create_index(
        "ix_life_change_review_case_time", "life_change_reviews",
        ["case_id", "reviewed_at"], unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_life_change_review_case_time", table_name="life_change_reviews")
    op.drop_table("life_change_reviews")
    op.drop_index("ix_life_change_case_pet_created", table_name="life_change_cases")
    op.drop_table("life_change_cases")

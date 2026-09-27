"""r2p3d template-local pipeline: pet_visual_jobs + surface manifests

Revision ID: a0b1c2d3e4f5
Revises: 21b4b571112a
Create Date: 2026-09-28 00:40:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, None] = "21b4b571112a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pet_visual_jobs",
        sa.Column("pet_id", sa.UUID(), nullable=False),
        sa.Column("model_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("progress", sa.Integer(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("error_reason", sa.String(length=200), nullable=True),
        sa.Column("idempotency_key", sa.String(length=120), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["model_id"], ["pet_visual_models.id"],
            name=op.f("fk_pet_visual_jobs_model_id_pet_visual_models"),
        ),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pets.id"],
            name=op.f("fk_pet_visual_jobs_pet_id_pets"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pet_visual_jobs")),
    )
    op.create_index("ix_pvj_pet", "pet_visual_jobs", ["pet_id"], unique=False)
    # SAFETY: surface manifests are presentation metadata about a candidate
    # model (OBSERVED/INFERRED), never clinical facts; default to empty object.
    op.add_column(
        "pet_visual_models",
        sa.Column(
            "observed_surface_manifest",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.add_column(
        "pet_visual_models",
        sa.Column(
            "inferred_surface_manifest",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("pet_visual_models", "inferred_surface_manifest")
    op.drop_column("pet_visual_models", "observed_surface_manifest")
    op.drop_index("ix_pvj_pet", table_name="pet_visual_jobs")
    op.drop_table("pet_visual_jobs")

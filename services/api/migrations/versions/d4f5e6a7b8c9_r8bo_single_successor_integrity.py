"""R8BO enforce a single direct successor for each LifeEvent.

Revision ID: d4f5e6a7b8c9
Revises: f1e2d3c4b5a6

A→B→C is a valid correction chain. A→B plus A→C is a fork and makes
source validity / superseded_by_event_id nondeterministic, so fail closed.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4f5e6a7b8c9"
down_revision: Union[str, None] = "f1e2d3c4b5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEX_NAME = "uq_life_events_one_successor"


def upgrade() -> None:
    bind = op.get_bind()
    fork = bind.execute(sa.text("""
        SELECT pet_id, supersedes_event_id, count(*) AS successor_count
        FROM life_events
        WHERE supersedes_event_id IS NOT NULL
        GROUP BY pet_id, supersedes_event_id
        HAVING count(*) > 1
        LIMIT 1
    """)).mappings().first()
    if fork is not None:
        raise RuntimeError(
            "Cannot enforce one-successor LifeEvent invariant: "
            f"pet={fork['pet_id']} original={fork['supersedes_event_id']} "
            f"has {fork['successor_count']} direct successors."
        )
    op.create_index(
        INDEX_NAME,
        "life_events",
        ["pet_id", "supersedes_event_id"],
        unique=True,
        postgresql_where=sa.text("supersedes_event_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(INDEX_NAME, table_name="life_events")

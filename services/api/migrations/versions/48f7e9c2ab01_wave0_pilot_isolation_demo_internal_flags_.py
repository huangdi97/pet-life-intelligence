"""wave0 pilot isolation: user/pet demo/internal flags + pilot_orgs

Revision ID: 48f7e9c2ab01
Revises: 3756fdb0fb13
Create Date: 2026-09-18 14:20:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '48f7e9c2ab01'
down_revision: Union[str, None] = '3756fdb0fb13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- pilot isolation flags (PLI-GW0) ---
    op.add_column('users', sa.Column('is_demo', sa.Boolean(), nullable=False,
                                     server_default=sa.false()))
    op.add_column('users', sa.Column('is_internal', sa.Boolean(), nullable=False,
                                     server_default=sa.false()))
    op.add_column('pets', sa.Column('is_demo', sa.Boolean(), nullable=False,
                                    server_default=sa.false()))
    op.add_column('pets', sa.Column('is_internal', sa.Boolean(), nullable=False,
                                    server_default=sa.false()))

    # --- pilot_orgs metadata table (PLI-GW0) ---
    op.create_table('pilot_orgs',
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('org_type', sa.String(length=30), nullable=False),
    sa.Column('contact', sa.String(length=200), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('expected_end_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('participant_limit', sa.Integer(), nullable=True),
    sa.Column('consent_version', sa.String(length=30), nullable=False),
    sa.Column('notes', sa.Text(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_pilot_orgs'))
    )
    op.create_index('ix_pilot_orgs_name', 'pilot_orgs', ['name'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_pilot_orgs_name', table_name='pilot_orgs')
    op.drop_table('pilot_orgs')
    op.drop_column('pets', 'is_internal')
    op.drop_column('pets', 'is_demo')
    op.drop_column('users', 'is_internal')
    op.drop_column('users', 'is_demo')

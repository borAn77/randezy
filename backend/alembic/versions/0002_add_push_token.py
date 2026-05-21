"""add push_token to businesses

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # IF NOT EXISTS makes this safe to re-run if column was added manually
    op.execute("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS push_token TEXT")


def downgrade() -> None:
    op.drop_column('businesses', 'push_token')

"""add email verification to users

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-03
"""
from alembic import op
import sqlalchemy as sa

revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp VARCHAR(8)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMPTZ")


def downgrade() -> None:
    op.drop_column('users', 'email_otp_expires_at')
    op.drop_column('users', 'email_otp')
    op.drop_column('users', 'email_verified')

"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-17
"""
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enum types
    op.execute("CREATE TYPE userrole AS ENUM ('customer', 'business_owner')")
    op.execute(
        "CREATE TYPE appointmentstatus AS ENUM "
        "('pending', 'confirmed', 'cancelled', 'completed', 'no_show')"
    )

    op.create_table(
        "users",
        sa.Column("supabase_id", sa.String(36), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column(
            "role",
            sa.Enum("customer", "business_owner", name="userrole", create_type=False),
            nullable=False,
            server_default="customer",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("supabase_id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "businesses",
        sa.Column("id", UUID(as_uuid=True), nullable=False, default=uuid.uuid4),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("opening_hours", JSONB, nullable=True),
        sa.Column("cover_image_url", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.supabase_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_businesses_slug", "businesses", ["slug"], unique=True)
    op.create_index("ix_businesses_city", "businesses", ["city"])
    op.create_index("ix_businesses_category", "businesses", ["category"])

    op.create_table(
        "business_photos",
        sa.Column("id", UUID(as_uuid=True), nullable=False, default=uuid.uuid4),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "services",
        sa.Column("id", UUID(as_uuid=True), nullable=False, default=uuid.uuid4),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "staff",
        sa.Column("id", UUID(as_uuid=True), nullable=False, default=uuid.uuid4),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=True),
        sa.Column("photo_url", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "staff_services",
        sa.Column("staff_id", UUID(as_uuid=True), nullable=False),
        sa.Column("service_id", UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["staff_id"], ["staff.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("staff_id", "service_id"),
    )

    op.create_table(
        "appointments",
        sa.Column("id", UUID(as_uuid=True), nullable=False, default=uuid.uuid4),
        sa.Column("customer_id", sa.String(36), nullable=False),
        sa.Column("business_id", UUID(as_uuid=True), nullable=False),
        sa.Column("staff_id", UUID(as_uuid=True), nullable=True),
        sa.Column("service_id", UUID(as_uuid=True), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "confirmed", "cancelled", "completed", "no_show",
                name="appointmentstatus",
                create_type=False,
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["customer_id"], ["users.supabase_id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.ForeignKeyConstraint(["staff_id"], ["staff.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_appointments_customer_id", "appointments", ["customer_id"])
    op.create_index("ix_appointments_business_id", "appointments", ["business_id"])
    op.create_index("ix_appointments_start_time", "appointments", ["start_time"])


def downgrade() -> None:
    op.drop_table("appointments")
    op.drop_table("staff_services")
    op.drop_table("staff")
    op.drop_table("services")
    op.drop_table("business_photos")
    op.drop_table("businesses")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS appointmentstatus")
    op.execute("DROP TYPE IF EXISTS userrole")

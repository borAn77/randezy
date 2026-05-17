from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SQLEnum, Float,
    ForeignKey, Integer, JSON, String, Table, Text, Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    business_owner = "business_owner"


class AppointmentStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"
    no_show = "no_show"


# Many-to-many association table (defined before Staff & Service classes)
staff_services = Table(
    "staff_services",
    Base.metadata,
    Column("staff_id", Uuid(as_uuid=True), ForeignKey("staff.id", ondelete="CASCADE"), primary_key=True),
    Column("service_id", Uuid(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    supabase_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="userrole"), server_default=UserRole.customer.value
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    businesses: Mapped[list[Business]] = relationship("Business", back_populates="owner")
    appointments: Mapped[list[Appointment]] = relationship(
        "Appointment", back_populates="customer", foreign_keys="Appointment.customer_id"
    )


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.supabase_id"))
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    category: Mapped[str] = mapped_column(String, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    opening_hours: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    cover_image_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped[User] = relationship("User", back_populates="businesses")
    photos: Mapped[list[BusinessPhoto]] = relationship(
        "BusinessPhoto", back_populates="business", cascade="all, delete-orphan"
    )
    services: Mapped[list[Service]] = relationship(
        "Service", back_populates="business", cascade="all, delete-orphan"
    )
    staff: Mapped[list[Staff]] = relationship(
        "Staff", back_populates="business", cascade="all, delete-orphan"
    )
    appointments: Mapped[list[Appointment]] = relationship("Appointment", back_populates="business")


class BusinessPhoto(Base):
    __tablename__ = "business_photos"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE")
    )
    url: Mapped[str] = mapped_column(String)
    position: Mapped[int] = mapped_column(Integer, server_default="0")

    business: Mapped[Business] = relationship("Business", back_populates="photos")


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    business: Mapped[Business] = relationship("Business", back_populates="services")
    staff_members: Mapped[list[Staff]] = relationship(
        "Staff", secondary=staff_services, back_populates="services"
    )
    appointments: Mapped[list[Appointment]] = relationship("Appointment", back_populates="service")


class Staff(Base):
    __tablename__ = "staff"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String)
    role: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    photo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")

    business: Mapped[Business] = relationship("Business", back_populates="staff")
    services: Mapped[list[Service]] = relationship(
        "Service", secondary=staff_services, back_populates="staff_members"
    )
    appointments: Mapped[list[Appointment]] = relationship("Appointment", back_populates="staff_member")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.supabase_id"), index=True)
    business_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("businesses.id"), index=True
    )
    staff_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("staff.id"), nullable=True
    )
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("services.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[AppointmentStatus] = mapped_column(
        SQLEnum(AppointmentStatus, name="appointmentstatus"),
        server_default=AppointmentStatus.pending.value,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped[User] = relationship(
        "User", back_populates="appointments", foreign_keys=[customer_id]
    )
    business: Mapped[Business] = relationship("Business", back_populates="appointments")
    staff_member: Mapped[Optional[Staff]] = relationship("Staff", back_populates="appointments")
    service: Mapped[Service] = relationship("Service", back_populates="appointments")

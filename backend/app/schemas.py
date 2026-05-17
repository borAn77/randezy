from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models import AppointmentStatus, UserRole


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    supabase_id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


# ── Business ──────────────────────────────────────────────────────────────────

class BusinessCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    opening_hours: Optional[list] = None
    cover_image_url: Optional[str] = None


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    opening_hours: Optional[list] = None
    cover_image_url: Optional[str] = None
    is_active: Optional[bool] = None


class BusinessPhotoOut(BaseModel):
    id: uuid.UUID
    url: str
    position: int

    model_config = {"from_attributes": True}


class BusinessOut(BaseModel):
    id: uuid.UUID
    owner_id: str
    name: str
    slug: str
    category: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    opening_hours: Optional[list] = None
    cover_image_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class BusinessDetail(BusinessOut):
    services: list[ServiceOut] = []
    staff: list[StaffOut] = []
    photos: list[BusinessPhotoOut] = []


class PaginatedBusinesses(BaseModel):
    items: list[BusinessOut]
    total: int
    page: int
    page_size: int


# ── Service ───────────────────────────────────────────────────────────────────

class ServiceCreate(BaseModel):
    name: str
    duration_minutes: int
    price: float
    description: Optional[str] = None


class ServiceOut(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    duration_minutes: int
    price: float
    description: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


# ── Staff ─────────────────────────────────────────────────────────────────────

class StaffCreate(BaseModel):
    name: str
    role: Optional[str] = None
    photo_url: Optional[str] = None
    service_ids: Optional[list[uuid.UUID]] = None


class StaffOut(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    role: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


# ── Appointment ───────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    business_id: uuid.UUID
    service_id: uuid.UUID
    start_time: datetime
    staff_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class AppointmentOut(BaseModel):
    id: uuid.UUID
    customer_id: str
    business_id: uuid.UUID
    staff_id: Optional[uuid.UUID] = None
    service_id: uuid.UUID
    start_time: datetime
    end_time: datetime
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AppointmentDetail(AppointmentOut):
    business: Optional[BusinessOut] = None
    service: Optional[ServiceOut] = None


# ── Availability ──────────────────────────────────────────────────────────────

class TimeSlot(BaseModel):
    start: datetime
    end: datetime


# Forward-reference resolution
BusinessDetail.model_rebuild()
AppointmentDetail.model_rebuild()

from __future__ import annotations

import re
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    Appointment, AppointmentStatus, Business, BusinessPhoto,
    Service, Staff, User, UserRole,
)
from app.schemas import (
    AppointmentOut, BusinessCreate, BusinessDetail, BusinessOut, BusinessUpdate,
    PaginatedBusinesses, ServiceCreate, ServiceOut, StaffCreate, StaffOut, TimeSlot,
)

router = APIRouter(prefix="/businesses", tags=["businesses"])

SLOT_INTERVAL = timedelta(minutes=30)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    tr = str.maketrans("çğıöşüÇĞIÖŞÜ", "cgiOsuCGIOSU")
    text = text.lower().strip().translate(tr)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)
    slug = base
    counter = 1
    while db.execute(select(Business).where(Business.slug == slug)).scalar_one_or_none():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def _assert_owner(business: Business, user: User) -> None:
    if business.owner_id != user.supabase_id:
        raise HTTPException(403, "Bu işletme üzerinde yetkiniz yok")


# ── Owner endpoints ───────────────────────────────────────────────────────────

@router.post("", response_model=BusinessOut, status_code=201)
def create_business(
    payload: BusinessCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    slug = _unique_slug(db, payload.name)
    business = Business(owner_id=user.supabase_id, slug=slug, **payload.model_dump())
    db.add(business)
    if user.role != UserRole.business_owner:
        user.role = UserRole.business_owner
    db.commit()
    db.refresh(business)
    return business


@router.patch("/{business_id}", response_model=BusinessOut)
def update_business(
    business_id: uuid.UUID,
    payload: BusinessUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "İşletme bulunamadı")
    _assert_owner(business, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business


@router.put("/me/push-token", status_code=204)
def register_push_token(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    token = payload.get("token", "")
    business = db.execute(
        select(Business).where(Business.owner_id == user.supabase_id)
    ).scalar_one_or_none()
    if business:
        business.push_token = token
        db.commit()


@router.post("/{business_id}/services", response_model=ServiceOut, status_code=201)
def add_service(
    business_id: uuid.UUID,
    payload: ServiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "İşletme bulunamadı")
    _assert_owner(business, user)
    service = Service(business_id=business_id, **payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.get("/{business_id}/services", response_model=list[ServiceOut])
def list_services(business_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.execute(
        select(Service).where(Service.business_id == business_id, Service.is_active.is_(True))
    ).scalars().all()


@router.post("/{business_id}/staff", response_model=StaffOut, status_code=201)
def add_staff(
    business_id: uuid.UUID,
    payload: StaffCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "İşletme bulunamadı")
    _assert_owner(business, user)

    service_ids = payload.service_ids or []
    member = Staff(business_id=business_id, **payload.model_dump(exclude={"service_ids"}))

    if service_ids:
        member.services = db.execute(
            select(Service).where(
                Service.id.in_(service_ids), Service.business_id == business_id
            )
        ).scalars().all()

    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/{business_id}/appointments", response_model=list[AppointmentOut])
def list_business_appointments(
    business_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "İşletme bulunamadı")
    _assert_owner(business, user)
    return db.execute(
        select(Appointment)
        .where(Appointment.business_id == business_id)
        .order_by(Appointment.start_time.desc())
    ).scalars().all()


# ── Discovery endpoints ───────────────────────────────────────────────────────

@router.get("", response_model=PaginatedBusinesses)
def search_businesses(
    city: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(Business).where(Business.is_active.is_(True))
    if city:
        stmt = stmt.where(Business.city.ilike(f"%{city}%"))
    if category:
        stmt = stmt.where(Business.category.ilike(f"%{category}%"))
    if q:
        stmt = stmt.where(
            or_(Business.name.ilike(f"%{q}%"), Business.description.ilike(f"%{q}%"))
        )

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    items = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedBusinesses(items=items, total=total, page=page, page_size=page_size)


@router.get("/{identifier}", response_model=BusinessDetail)
def get_business(identifier: str, db: Session = Depends(get_db)):
    # Accept UUID or slug
    business = None
    try:
        bid = uuid.UUID(identifier)
        business = db.get(Business, bid)
    except ValueError:
        business = db.execute(
            select(Business).where(Business.slug == identifier)
        ).scalar_one_or_none()

    if not business:
        raise HTTPException(404, "İşletme bulunamadı")
    return business


@router.get("/{business_id}/availability", response_model=list[TimeSlot])
def get_availability(
    business_id: uuid.UUID,
    service_id: uuid.UUID = Query(...),
    date: date = Query(...),
    staff_id: Optional[uuid.UUID] = Query(None),
    db: Session = Depends(get_db),
):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(404, "İşletme bulunamadı")
    service = db.get(Service, service_id)
    if not service:
        raise HTTPException(404, "Hizmet bulunamadı")

    # day_of_week: 1=Mon … 7=Sun (matching frontend shop_hours format)
    py_weekday = date.weekday()  # 0=Mon … 6=Sun
    day_of_week = py_weekday + 1 if py_weekday < 6 else 7

    hours_entry = None
    for h in (business.opening_hours or []):
        if h.get("day_of_week") == day_of_week and not h.get("is_closed", False):
            hours_entry = h
            break

    if not hours_entry:
        return []

    tz = ZoneInfo("Europe/Istanbul")
    open_dt = datetime.combine(
        date, datetime.strptime(hours_entry["open_time"], "%H:%M").time(), tzinfo=tz
    )
    close_dt = datetime.combine(
        date, datetime.strptime(hours_entry["close_time"], "%H:%M").time(), tzinfo=tz
    )
    duration = timedelta(minutes=service.duration_minutes)

    apt_stmt = select(Appointment).where(
        Appointment.business_id == business_id,
        Appointment.status.not_in([AppointmentStatus.cancelled]),
        Appointment.start_time >= open_dt,
        Appointment.start_time < close_dt + timedelta(hours=1),
    )
    if staff_id:
        apt_stmt = apt_stmt.where(Appointment.staff_id == staff_id)

    existing = db.execute(apt_stmt).scalars().all()

    slots: list[TimeSlot] = []
    current = open_dt
    while current + duration <= close_dt:
        slot_end = current + duration
        if all(
            not (current < a.end_time and slot_end > a.start_time) for a in existing
        ):
            slots.append(TimeSlot(start=current, end=slot_end))
        current += SLOT_INTERVAL

    return slots

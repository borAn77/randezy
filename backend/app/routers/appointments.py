from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app import email as email_service
from app.models import Appointment, AppointmentStatus, Business, Service, Staff, User
from app.schemas import AppointmentCreate, AppointmentDetail, AppointmentOut

router = APIRouter(tags=["appointments"])


@router.post("/appointments", response_model=AppointmentOut, status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    service = db.get(Service, payload.service_id)
    if not service:
        raise HTTPException(404, "Hizmet bulunamadı")
    business = db.get(Business, payload.business_id)
    if not business:
        raise HTTPException(404, "İşletme bulunamadı")

    start = payload.start_time
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    end = start + timedelta(minutes=service.duration_minutes)

    # Conflict check — same staff, overlapping window, non-cancelled
    if payload.staff_id:
        conflict = db.execute(
            select(Appointment).where(
                Appointment.staff_id == payload.staff_id,
                Appointment.status.not_in([AppointmentStatus.cancelled]),
                Appointment.start_time < end,
                Appointment.end_time > start,
            )
        ).scalar_one_or_none()
        if conflict:
            raise HTTPException(409, "Bu zaman diliminde çakışan randevu mevcut")

    appointment = Appointment(
        customer_id=user.supabase_id,
        business_id=payload.business_id,
        staff_id=payload.staff_id,
        service_id=payload.service_id,
        start_time=start,
        end_time=end,
        notes=payload.notes,
        status=AppointmentStatus.pending,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    staff_name: str | None = None
    if payload.staff_id:
        staff = db.get(Staff, payload.staff_id)
        if staff:
            staff_name = staff.name

    background_tasks.add_task(
        email_service.send_appointment_created,
        customer_email=user.email,
        customer_name=user.full_name,
        business_name=business.name,
        service_name=service.name,
        start_time=appointment.start_time,
        staff_name=staff_name,
    )
    return appointment


@router.get("/me/appointments", response_model=list[AppointmentDetail])
def get_my_appointments(
    status: Optional[str] = Query(None, pattern="^(upcoming|past)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    stmt = select(Appointment).where(Appointment.customer_id == user.supabase_id)

    if status == "upcoming":
        stmt = stmt.where(
            Appointment.start_time >= now,
            Appointment.status.not_in([AppointmentStatus.cancelled]),
        )
    elif status == "past":
        stmt = stmt.where(Appointment.start_time < now)

    appointments = db.execute(stmt.order_by(Appointment.start_time.desc())).scalars().all()
    return appointments


@router.patch("/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    appointment_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(404, "Randevu bulunamadı")
    if appointment.customer_id != user.supabase_id:
        raise HTTPException(403, "Bu randevuyu iptal etme yetkiniz yok")
    if appointment.status == AppointmentStatus.cancelled:
        raise HTTPException(400, "Randevu zaten iptal edilmiş")

    business = db.get(Business, appointment.business_id)
    service = db.get(Service, appointment.service_id)

    appointment.status = AppointmentStatus.cancelled
    db.commit()
    db.refresh(appointment)

    background_tasks.add_task(
        email_service.send_appointment_cancelled,
        customer_email=user.email,
        customer_name=user.full_name,
        business_name=business.name if business else "",
        service_name=service.name if service else "",
        start_time=appointment.start_time,
    )
    return appointment

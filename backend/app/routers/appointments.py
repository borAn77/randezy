from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app import email as email_service
from app import push as push_service
from app.models import Appointment, AppointmentStatus, Business, Service, Staff, User
from app.schemas import AppointmentCreate, AppointmentDetail, AppointmentOut

BUFFER = timedelta(minutes=5)
_NON_BLOCKING = [AppointmentStatus.cancelled, AppointmentStatus.no_show]

router = APIRouter(tags=["appointments"])


class ConfirmEmailPayload(BaseModel):
    customer_email: str
    customer_name: str | None = None
    business_name: str
    service_name: str
    start_time: datetime
    staff_name: str | None = None


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

    # effective_staff_id may be auto-assigned when customer chose "any staff"
    effective_staff_id = payload.staff_id

    if payload.staff_id:
        # Specific staff — check overlap including 5-minute buffer after existing appointments
        conflict = db.execute(
            select(Appointment).where(
                Appointment.staff_id == payload.staff_id,
                Appointment.status.not_in(_NON_BLOCKING),
                Appointment.start_time < end,
                Appointment.end_time > start - BUFFER,
            )
        ).scalar_one_or_none()
        if conflict:
            raise HTTPException(409, "Bu saat az önce doldu. Lütfen başka bir saat seçin.")
    else:
        # No staff specified — auto-assign first available active staff member
        active_staff = db.execute(
            select(Staff).where(
                Staff.business_id == payload.business_id,
                Staff.is_active.is_(True),
            )
        ).scalars().all()

        if active_staff:
            for s in active_staff:
                busy = db.execute(
                    select(Appointment).where(
                        Appointment.staff_id == s.id,
                        Appointment.status.not_in(_NON_BLOCKING),
                        Appointment.start_time < end,
                        Appointment.end_time > start - BUFFER,
                    )
                ).scalar_one_or_none()
                if not busy:
                    effective_staff_id = s.id
                    break
            if not effective_staff_id:
                raise HTTPException(
                    409, "Bu saat için müsait personel bulunmuyor. Lütfen başka bir saat seçin."
                )
        else:
            # Business has no staff — guard against unassigned appointment overlap
            conflict = db.execute(
                select(Appointment).where(
                    Appointment.business_id == payload.business_id,
                    Appointment.staff_id.is_(None),
                    Appointment.status.not_in(_NON_BLOCKING),
                    Appointment.start_time < end,
                    Appointment.end_time > start - BUFFER,
                )
            ).scalar_one_or_none()
            if conflict:
                raise HTTPException(409, "Bu saat az önce doldu. Lütfen başka bir saat seçin.")

    appointment = Appointment(
        customer_id=user.supabase_id,
        business_id=payload.business_id,
        staff_id=effective_staff_id,
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

    if business.push_token:
        date_str = appointment.start_time.strftime("%d.%m.%Y %H:%M")
        background_tasks.add_task(
            push_service.send_push,
            token=business.push_token,
            title="Yeni Randevu 📅",
            body=f"{user.full_name or 'Müşteri'} — {service.name} · {date_str}",
            data={"type": "new_appointment", "appointment_id": str(appointment.id)},
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


@router.post("/appointments/send-confirmed-email")
def send_confirmed_email(
    payload: ConfirmEmailPayload,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
):
    background_tasks.add_task(
        email_service.send_appointment_confirmed,
        customer_email=payload.customer_email,
        customer_name=payload.customer_name,
        business_name=payload.business_name,
        service_name=payload.service_name,
        start_time=payload.start_time,
        staff_name=payload.staff_name,
    )
    return {"status": "ok"}


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

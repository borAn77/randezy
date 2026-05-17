import uuid
from datetime import datetime, timedelta, timezone

from app.models import Appointment, AppointmentStatus


def _future(hours: int = 2) -> datetime:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).replace(microsecond=0)


def test_create_appointment_happy_path(client_as_customer, business, service):
    resp = client_as_customer.post(
        "/appointments",
        json={
            "business_id": str(business.id),
            "service_id": str(service.id),
            "start_time": _future().isoformat(),
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert data["business_id"] == str(business.id)


def test_create_appointment_unknown_service(client_as_customer, business):
    resp = client_as_customer.post(
        "/appointments",
        json={
            "business_id": str(business.id),
            "service_id": str(uuid.uuid4()),
            "start_time": _future().isoformat(),
        },
    )
    assert resp.status_code == 404


def test_create_appointment_conflict(client_as_customer, business, service, staff_member, db, customer):
    start = _future(2)
    end = start + timedelta(minutes=30)
    existing = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,
        business_id=business.id,
        staff_id=staff_member.id,
        service_id=service.id,
        start_time=start,
        end_time=end,
        status=AppointmentStatus.pending,
    )
    db.add(existing)
    db.commit()

    # Same staff, same time → 409
    resp = client_as_customer.post(
        "/appointments",
        json={
            "business_id": str(business.id),
            "service_id": str(service.id),
            "staff_id": str(staff_member.id),
            "start_time": start.isoformat(),
        },
    )
    assert resp.status_code == 409


def test_create_appointment_no_conflict_different_staff(client_as_customer, business, service, db, customer):
    other_staff = __import__("app.models", fromlist=["Staff"]).Staff(
        id=uuid.uuid4(), business_id=business.id, name="Ali"
    )
    db.add(other_staff)
    db.commit()

    start = _future(2)
    end = start + timedelta(minutes=30)
    existing = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,
        business_id=business.id,
        staff_id=other_staff.id,
        service_id=service.id,
        start_time=start,
        end_time=end,
        status=AppointmentStatus.pending,
    )
    db.add(existing)
    db.commit()

    # Different staff → no conflict
    yet_another = __import__("app.models", fromlist=["Staff"]).Staff(
        id=uuid.uuid4(), business_id=business.id, name="Veli"
    )
    db.add(yet_another)
    db.commit()

    resp = client_as_customer.post(
        "/appointments",
        json={
            "business_id": str(business.id),
            "service_id": str(service.id),
            "staff_id": str(yet_another.id),
            "start_time": start.isoformat(),
        },
    )
    assert resp.status_code == 201


def test_get_my_appointments_upcoming(client_as_customer, business, service, customer, db):
    start = _future(3)
    apt = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,
        business_id=business.id,
        service_id=service.id,
        start_time=start,
        end_time=start + timedelta(minutes=30),
        status=AppointmentStatus.pending,
    )
    db.add(apt)
    db.commit()

    resp = client_as_customer.get("/me/appointments?status=upcoming")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_my_appointments_past(client_as_customer, business, service, customer, db):
    past_start = datetime.now(timezone.utc) - timedelta(hours=5)
    apt = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,
        business_id=business.id,
        service_id=service.id,
        start_time=past_start,
        end_time=past_start + timedelta(minutes=30),
        status=AppointmentStatus.completed,
    )
    db.add(apt)
    db.commit()

    resp = client_as_customer.get("/me/appointments?status=past")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_cancel_appointment_happy_path(client_as_customer, business, service, customer, db):
    start = _future(2)
    apt = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,
        business_id=business.id,
        service_id=service.id,
        start_time=start,
        end_time=start + timedelta(minutes=30),
        status=AppointmentStatus.pending,
    )
    db.add(apt)
    db.commit()

    resp = client_as_customer.patch(f"/appointments/{apt.id}/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


def test_cancel_already_cancelled(client_as_customer, business, service, customer, db):
    start = _future(2)
    apt = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,
        business_id=business.id,
        service_id=service.id,
        start_time=start,
        end_time=start + timedelta(minutes=30),
        status=AppointmentStatus.cancelled,
    )
    db.add(apt)
    db.commit()

    resp = client_as_customer.patch(f"/appointments/{apt.id}/cancel")
    assert resp.status_code == 400


def test_cancel_others_appointment(client_as_owner, business, service, customer, db):
    start = _future(2)
    apt = Appointment(
        id=uuid.uuid4(),
        customer_id=customer.supabase_id,  # belongs to customer, not owner
        business_id=business.id,
        service_id=service.id,
        start_time=start,
        end_time=start + timedelta(minutes=30),
        status=AppointmentStatus.pending,
    )
    db.add(apt)
    db.commit()

    resp = client_as_owner.patch(f"/appointments/{apt.id}/cancel")
    assert resp.status_code == 403


def test_cancel_nonexistent_appointment(client_as_customer):
    resp = client_as_customer.patch(f"/appointments/{uuid.uuid4()}/cancel")
    assert resp.status_code == 404

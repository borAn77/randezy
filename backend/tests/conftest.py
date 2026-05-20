import os
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Use SQLite in-memory for tests (no Supabase connection needed)
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")

from app.auth import get_current_user  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Business, Service, Staff, User, UserRole  # noqa: E402

TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ── Fixture users ─────────────────────────────────────────────────────────────

@pytest.fixture
def customer(db) -> User:
    u = User(supabase_id="customer-id-001", email="customer@test.com", role=UserRole.customer)
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def owner(db) -> User:
    u = User(supabase_id="owner-id-001", email="owner@test.com", role=UserRole.business_owner)
    db.add(u)
    db.commit()
    return u


@pytest.fixture
def client_as_customer(client, customer):
    app.dependency_overrides[get_current_user] = lambda: customer
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client_as_owner(client, owner):
    app.dependency_overrides[get_current_user] = lambda: owner
    yield client
    app.dependency_overrides.pop(get_current_user, None)


# ── Fixture data ──────────────────────────────────────────────────────────────

@pytest.fixture
def business(db, owner) -> Business:
    b = Business(
        id=uuid.uuid4(),
        owner_id=owner.supabase_id,
        name="Test Berber",
        slug="test-berber",
        category="Berber",
        city="İstanbul",
        is_active=True,
    )
    db.add(b)
    db.commit()
    return b


@pytest.fixture
def service(db, business) -> Service:
    s = Service(
        id=uuid.uuid4(),
        business_id=business.id,
        name="Saç Kesimi",
        duration_minutes=30,
        price=100.0,
        is_active=True,
    )
    db.add(s)
    db.commit()
    return s


@pytest.fixture
def staff_member(db, business) -> Staff:
    m = Staff(id=uuid.uuid4(), business_id=business.id, name="Ahmet", is_active=True)
    db.add(m)
    db.commit()
    return m

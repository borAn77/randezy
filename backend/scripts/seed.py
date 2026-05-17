"""
Seed script — 10 örnek işletme, 3 kategori, 5 şehir
Çalıştır: cd backend && python -m scripts.seed
"""
import os
import re
import sys
import uuid

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

from app.models import Base, Business, Service, Staff, User, UserRole  # noqa: E402

OPENING_HOURS = [
    {"day_of_week": d, "open_time": "09:00", "close_time": "20:00", "is_closed": d == 7}
    for d in range(1, 8)
]

BUSINESSES = [
    {"name": "Style Point Kuaför",    "category": "Kuaför",          "city": "İstanbul", "address": "Bağcılar Mah. 12. Sk. No:4"},
    {"name": "Güzellik Merkezi Elif", "category": "Güzellik Salonu", "city": "İstanbul", "address": "Şişli Blv. 34"},
    {"name": "Classic Barber",        "category": "Berber",          "city": "Ankara",   "address": "Kızılay Cad. No:7"},
    {"name": "İzmir Saç Tasarım",     "category": "Kuaför",          "city": "İzmir",    "address": "Alsancak Mah. No:15"},
    {"name": "Bursa Güzellik",        "category": "Güzellik Salonu", "city": "Bursa",    "address": "Nilüfer Cad. 22"},
    {"name": "Antalya Berber",        "category": "Berber",          "city": "Antalya",  "address": "Konyaaltı Blv. 8"},
    {"name": "Mega Kuaför",           "category": "Kuaför",          "city": "İstanbul", "address": "Kadıköy Sk. 3"},
    {"name": "VIP Saç Bakım",         "category": "Kuaför",          "city": "Ankara",   "address": "Çankaya Mah. 5"},
    {"name": "Moda Berber",           "category": "Berber",          "city": "İzmir",    "address": "Konak Mey. 1"},
    {"name": "Lux Güzellik",          "category": "Güzellik Salonu", "city": "İstanbul", "address": "Beşiktaş No:19"},
]

SERVICES_BY_CATEGORY: dict[str, list[dict]] = {
    "Kuaför": [
        {"name": "Saç Kesimi",   "duration_minutes": 30,  "price": 150.0},
        {"name": "Saç Boyama",   "duration_minutes": 90,  "price": 400.0},
        {"name": "Fön",          "duration_minutes": 30,  "price": 100.0},
        {"name": "Keratin Bakım","duration_minutes": 120, "price": 600.0},
    ],
    "Güzellik Salonu": [
        {"name": "Manikür",      "duration_minutes": 45, "price": 120.0},
        {"name": "Pedikür",      "duration_minutes": 45, "price": 130.0},
        {"name": "Kaş Alımı",   "duration_minutes": 20, "price": 60.0},
        {"name": "Cilt Bakımı", "duration_minutes": 60, "price": 250.0},
        {"name": "Kalıcı Oje",  "duration_minutes": 60, "price": 200.0},
    ],
    "Berber": [
        {"name": "Saç Kesimi",   "duration_minutes": 20, "price": 80.0},
        {"name": "Sakal Tıraşı","duration_minutes": 20, "price": 60.0},
        {"name": "Saç + Sakal", "duration_minutes": 40, "price": 120.0},
    ],
}

STAFF_POOL = [
    ("Ahmet Yılmaz", "Uzman Kuaför"),
    ("Mehmet Kaya",  "Kuaför"),
    ("Ayşe Demir",   "Güzellik Uzmanı"),
    ("Fatma Çelik",  "Berber"),
    ("Ali Şahin",    "Saç Stilisti"),
    ("Zeynep Kurt",  "Uzman Berber"),
    ("Hüseyin Arslan","Teknisyen"),
]


def slugify(text: str) -> str:
    tr = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiOsuCGIOSU")
    text = text.lower().strip().translate(tr)
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


def unique_slug(db, base: str) -> str:
    from sqlalchemy import select
    slug = slugify(base)
    n = 1
    while db.execute(select(Business).where(Business.slug == slug)).scalar_one_or_none():
        slug = f"{slugify(base)}-{n}"
        n += 1
    return slug


def seed() -> None:
    db = Session()
    try:
        # Seed owner user (merge so re-running is idempotent)
        owner = db.merge(User(
            supabase_id="seed-owner-00000000-0001",
            email="seed@randezy.com",
            full_name="Randezy Demo",
            role=UserRole.business_owner,
        ))
        db.flush()

        for i, biz_data in enumerate(BUSINESSES):
            slug = unique_slug(db, biz_data["name"])
            biz = Business(
                id=uuid.uuid4(),
                owner_id=owner.supabase_id,
                slug=slug,
                name=biz_data["name"],
                category=biz_data["category"],
                city=biz_data["city"],
                address=biz_data.get("address"),
                phone=f"0212 {500 + i:03d} {1000 + i:04d}"[:15],
                opening_hours=OPENING_HOURS,
                is_active=True,
            )
            db.add(biz)
            db.flush()

            # Services
            services = []
            for svc_data in SERVICES_BY_CATEGORY.get(biz_data["category"], []):
                svc = Service(id=uuid.uuid4(), business_id=biz.id, **svc_data)
                db.add(svc)
                services.append(svc)
            db.flush()

            # Staff (2 or 3 per business)
            count = 2 + (i % 2)
            for j in range(count):
                name, role = STAFF_POOL[(i + j) % len(STAFF_POOL)]
                member = Staff(
                    id=uuid.uuid4(),
                    business_id=biz.id,
                    name=name,
                    role=role,
                    is_active=True,
                )
                member.services = services[:2]
                db.add(member)

        db.commit()
        print(f"✓ Seeded {len(BUSINESSES)} businesses across 5 cities, 3 categories.")
    except Exception as exc:
        db.rollback()
        print(f"✗ Seed failed: {exc}", file=sys.stderr)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

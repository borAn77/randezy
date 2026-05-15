from typing import Optional
from sqlmodel import SQLModel, Field

# 🛍️ DÜKKAN TABLOSU
class Shop(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: str
    location: str
    image_url: str
    score: float = Field(default=0.0)
    reviews_count: int = Field(default=0)

# ✂️ HİZMET TABLOSU
class Service(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    price: float
    duration: int
    shop_id: int = Field(foreign_key="shop.id")

# 👤 KULLANICI TABLOSU (Rapor 3.2 gereği)
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)

# 📅 RANDEVU TABLOSU (Rapor 3.1 gereği)[cite: 1]
class Appointment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    shop_id: int = Field(foreign_key="shop.id")
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    service_name: str
    date: str
    time: str
    price: float
    notes: Optional[str] = None
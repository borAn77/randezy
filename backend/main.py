from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Session, select
from database import engine, get_session
from models import Shop, Service, User, Appointment # Modellerin tamamını çektik
from contextlib import asynccontextmanager
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel

# --- GÜVENLİK AYARLARI (Rapor 3.2 gereği) ---
SECRET_KEY = "randezy_gizli_anahtar_2026" # Güvenlik için özel anahtar
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # Token 24 saat geçerli kalır

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- AUTH ŞEMALARI (Veri Transfer Modelleri) ---
class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

# --- STARTUP / LIFESPAN ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    # Örnek verileri ekleme mantığı burada kalmaya devam ediyor
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- YARDIMCI FONKSİYONLAR ---
def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- AUTH ENDPOINTLERİ (Kayıt ve Giriş) ---

@app.post("/auth/register")
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    # Email daha önce alınmış mı kontrol et
    existing = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı.")
    
    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password)
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return {"status": "success", "message": "Kullanıcı oluşturuldu"}

@app.post("/auth/login")
def login(login_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email veya şifre hatalı.")
    
    token = create_access_token(data={"sub": user.email, "user_id": user.id})
    return {"access_token": token, "token_type": "bearer", "full_name": user.full_name}

# --- DÜKKAN VE SERVİS ENDPOINTLERİ (Mevcut yapı korundu) ---

@app.get("/shops")
def get_shops(session: Session = Depends(get_session)):
    return session.exec(select(Shop)).all()

@app.get("/shops/{shop_id}")
def get_shop(shop_id: int, session: Session = Depends(get_session)):
    shop = session.get(Shop, shop_id)
    if not shop:
        raise HTTPException(status_code=404, detail="Dükkan bulunamadı")
    return shop

@app.get("/shops/{shop_id}/services")
def get_shop_services(shop_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Service).where(Service.shop_id == shop_id)).all()

# --- RANDEVU ENDPOINTLERİ ---

@app.post("/appointments")
def create_appointment(appointment: Appointment, session: Session = Depends(get_session)):
    session.add(appointment)
    session.commit()
    session.refresh(appointment)
    return {"status": "success", "data": appointment}
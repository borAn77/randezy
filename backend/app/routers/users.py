import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.email import send_verification_email
from app.models import Business, User
from app.schemas import BusinessOut, UserOut, UserUpdate, VerifyOtpRequest

router = APIRouter(tags=["users"])


@router.get("/auth/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/auth/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/send-verification")
def send_verification(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    otp = ''.join(random.choices('0123456789', k=6))
    user.email_otp = otp
    user.email_otp_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.commit()
    send_verification_email(user.email, otp)
    return {"status": "sent"}


@router.post("/auth/verify-otp")
def verify_otp(body: VerifyOtpRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.email_otp or not user.email_otp_expires_at:
        raise HTTPException(400, detail="Doğrulama kodu bulunamadı. Yeni kod isteyin.")
    expires = user.email_otp_expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(400, detail="Doğrulama kodunun süresi dolmuş. Yeni kod isteyin.")
    if user.email_otp.strip() != body.otp.strip():
        raise HTTPException(400, detail="Doğrulama kodu hatalı.")
    user.email_verified = True
    user.email_otp = None
    user.email_otp_expires_at = None
    db.commit()
    return {"status": "verified"}


@router.get("/me/businesses", response_model=list[BusinessOut])
def get_my_businesses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return user.businesses

import os
from fastapi import Depends, Header, HTTPException
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole

SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")


def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"JWT hatası: {e}")

    supabase_id: str = payload["sub"]
    email: str = payload.get("email", "")

    user = db.get(User, supabase_id)
    if not user:
        user = User(supabase_id=supabase_id, email=email, role=UserRole.customer)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def require_owner(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.business_owner:
        raise HTTPException(status_code=403, detail="Bu işlem için işletme sahibi rolü gerekli")
    return user

import os
import httpx
from fastapi import Depends, Header, HTTPException
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")

_jwks_cache: dict | None = None


def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        resp = httpx.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=5)
        resp.raise_for_status()
        _jwks_cache = resp.json()
    return _jwks_cache


def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        jwks = _get_jwks()
        keys = jwks.get("keys", [])
        key = next((k for k in keys if k.get("kid") == kid), keys[0] if keys else None)
        if not key:
            raise HTTPException(status_code=401, detail="JWT anahtarı bulunamadı")

        payload = jwt.decode(
            token,
            key,
            algorithms=["ES256", "RS256", "HS256"],
            audience="authenticated",
        )
    except JWTError:
        raise HTTPException(status_code=401, detail="Geçersiz veya süresi dolmuş token")

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

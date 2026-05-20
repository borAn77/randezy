from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Business, User
from app.schemas import BusinessOut, UserOut, UserUpdate

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


@router.get("/me/businesses", response_model=list[BusinessOut])
def get_my_businesses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return user.businesses

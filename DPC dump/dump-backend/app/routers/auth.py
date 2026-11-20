
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_user_id_from_token
)

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

bearer_scheme = HTTPBearer()


# ==========================================
# PROFILE UPDATE REQUEST
# ==========================================

class ProfileUpdateRequest(BaseModel):
    username: Optional[str] = Field(
        default=None, min_length=3, max_length=50
    )
    current_password: str = Field(min_length=1)
    new_password: Optional[str] = Field(
        default=None, min_length=8
    )


# ==========================================
# GET CURRENT LOGGED-IN USER
# ==========================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(credentials.credentials)

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


# ==========================================
# REGISTER
# ==========================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )

    new_user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password)
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception:
        db.rollback()
        raise

    return new_user


# ==========================================
# LOGIN
# ==========================================

@router.post("/login", response_model=TokenResponse)
def login(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if not user or not verify_password(
        user_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ==========================================
# GET CURRENT USER PROFILE
# ==========================================

@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


# ==========================================
# UPDATE CURRENT USERNAME / PASSWORD
# ==========================================

@router.patch("/me", response_model=UserResponse)
def update_my_profile(
    update_data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Require at least one field to be changed.
    if update_data.username is None and update_data.new_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a new username or new password"
        )

    # Verify the current password before allowing any changes.
    if not verify_password(
        update_data.current_password,
        current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Check whether the requested username is already taken.
    if update_data.username is not None:
        existing_user = db.query(User).filter(
            User.username == update_data.username,
            User.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )

        current_user.username = update_data.username

    # Hash the new password before saving it.
    if update_data.new_password is not None:
        current_user.password_hash = hash_password(
            update_data.new_password
        )

    try:
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
        raise

    return current_user

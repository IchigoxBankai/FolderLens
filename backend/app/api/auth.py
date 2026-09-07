import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.db import get_db, UserModel
from app.models.schema import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

DEMO_USER_ID = "demo-user-123"
DEMO_EMAIL = "nihar@folderlens.ai"
DEMO_NAME = "Nihar"

@router.post("/register", response_model=TokenResponse)
def register_user(req: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    user = UserModel(
        id=str(uuid.uuid4()),
        email=req.email,
        name=req.name,
        password_hash=req.password,  # Simple hash representation for dev
        avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={req.name}",
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    user_resp = UserResponse.from_orm(user)
    return TokenResponse(
        access_token=f"fl_token_{user.id}",
        user=user_resp
    )

@router.post("/login", response_model=TokenResponse)
def login_user(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email == req.email).first()
    if not user or user.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    user_resp = UserResponse.from_orm(user)
    return TokenResponse(
        access_token=f"fl_token_{user.id}",
        user=user_resp
    )

@router.get("/demo", response_model=TokenResponse)
def demo_login(db: Session = Depends(get_db)):
    """Provides a instant zero-config demo session for portfolio viewers."""
    user = db.query(UserModel).filter(UserModel.id == DEMO_USER_ID).first()
    if not user:
        user = UserModel(
            id=DEMO_USER_ID,
            email=DEMO_EMAIL,
            name=DEMO_NAME,
            password_hash="demo_password",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user_resp = UserResponse.from_orm(user)
    return TokenResponse(
        access_token=f"fl_token_{user.id}",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_current_user(token: str = "demo", db: Session = Depends(get_db)):
    user = db.query(UserModel).first()
    if not user:
        # Create default demo user
        user = UserModel(
            id=DEMO_USER_ID,
            email=DEMO_EMAIL,
            name=DEMO_NAME,
            password_hash="demo_password",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return UserResponse.from_orm(user)

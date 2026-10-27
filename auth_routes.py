"""Authentication routes: registration and login."""

from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select
from typing import Annotated
from fastapi import Depends

from app.auth import create_access_token, hash_password, verify_password
from app.dependencies import CurrentUser, DatabaseSession
from app.models import User
from app.schemas import Token, UserRegister, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(data: UserRegister, db: DatabaseSession) -> User:
    """Create a new user account."""
    # Check username uniqueness
    existing = db.scalars(
        select(User).where(
            (User.username == data.username) | (User.email == data.email)
        )
    ).first()
    if existing is not None:
        if existing.username == data.username:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DatabaseSession,
) -> dict[str, str]:
    """Authenticate with username + password and receive a JWT."""
    user = db.scalars(
        select(User).where(
            or_(
                User.username == form_data.username,
                User.email == form_data.username,
            )
        )
    ).first()

    if user is None or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: CurrentUser) -> User:
    """Return the currently authenticated user's profile."""
    return current_user

from __future__ import annotations

from fastapi import APIRouter

from app.auth.deps import auth_backend, fastapi_users
from app.auth.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter()

# Auth routes (JWT in cookies)
router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

# Registration and user management
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

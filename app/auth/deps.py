from __future__ import annotations

import os
import uuid
from collections.abc import AsyncGenerator

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.config import config
from app.db import get_async_session


# User DB adapter
async def get_user_db(
    session: AsyncSession = Depends(get_async_session),
) -> AsyncGenerator[SQLAlchemyUserDatabase, None]:
    yield SQLAlchemyUserDatabase(session, User)


# User manager implementation
class UserManager(BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = (
        config.get("APP_SECRET") or os.getenv("APP_SECRET") or "change-me"
    )
    verification_token_secret = (
        config.get("APP_SECRET") or os.getenv("APP_SECRET") or "change-me"
    )

    async def on_before_register(
        self, user_create, request: Request | None = None
    ) -> None:
        # Optional gate to disable registration in production
        allow_reg_env = os.getenv("ALLOW_USER_REGISTRATION")
        if allow_reg_env is None:
            # default: allow in dev, disable in prod
            allow = _env != "production"
        else:
            allow = allow_reg_env.lower() in ("1", "true", "yes")
        if not allow:
            raise ValueError("Registration is disabled")


async def get_user_manager(
    user_db: SQLAlchemyUserDatabase = Depends(get_user_db),
) -> AsyncGenerator[UserManager, None]:
    yield UserManager(user_db)


# Auth backend: cookie transport + JWT strategy
_env = os.getenv("ENV", "development").lower()

cookie_transport = CookieTransport(
    cookie_name="auth",
    cookie_max_age=60 * 60 * 24 * 7,  # 7 days
)


def get_jwt_strategy() -> JWTStrategy:
    secret = config.get("APP_SECRET") or os.getenv("APP_SECRET") or "change-me"
    return JWTStrategy(secret=secret, lifetime_seconds=60 * 60 * 12)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)


fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_manager,
    [auth_backend],
)

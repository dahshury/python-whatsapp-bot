from __future__ import annotations

from fastapi_users_db_sqlalchemy import SQLAlchemyBaseUserTableUUID

from app.db import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "users"

    # The base class already defines:
    #   id: UUID primary key
    #   email: str (unique)
    #   hashed_password: str
    #   is_active: bool
    #   is_superuser: bool
    #   is_verified: bool
    # Add minimal optional profile fields here if needed in the future
    # Example:
    # username: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)

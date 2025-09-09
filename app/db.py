import os

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    func,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, scoped_session, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

# Define the SQLite database file path
# Use environment variable if set, otherwise default to current working directory
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.getcwd(), "threads_db.sqlite"))

# SQLAlchemy engine and session factory (sync)
engine = create_engine(
    f"sqlite:///{DB_PATH}", echo=False, future=True, connect_args={"check_same_thread": False}
)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True))

# Async engine/session for libraries that require AsyncSession (e.g., fastapi-users)
async_engine = create_async_engine(
    f"sqlite+aiosqlite:///{DB_PATH}", echo=False, future=True
)
AsyncSessionLocal = sessionmaker(
    bind=async_engine, class_=AsyncSession, autoflush=False, autocommit=False, expire_on_commit=False
)

# Declarative Base
Base = declarative_base()


class CustomerModel(Base):
    __tablename__ = "customers"

    wa_id = Column(String, primary_key=True)
    customer_name = Column(String, nullable=True)

    __table_args__ = (
        Index("idx_customers_wa_id", "wa_id"),
    )


class ConversationModel(Base):
    __tablename__ = "conversation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wa_id = Column(String, ForeignKey("customers.wa_id"), nullable=False, index=True)
    role = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    date = Column(String, nullable=True)
    time = Column(String, nullable=True)

    customer = relationship("CustomerModel", backref="conversations")

    __table_args__ = (
        Index("idx_conversation_wa_id", "wa_id"),
        Index("idx_conversation_wa_id_date_time", "wa_id", "date", "time"),
    )


class ReservationModel(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wa_id = Column(String, ForeignKey("customers.wa_id"), nullable=False, index=True)
    date = Column(String, nullable=False, index=True)
    time_slot = Column(String, nullable=False, index=True)
    type = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="active")
    cancelled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    customer = relationship("CustomerModel", backref="reservations")

    __table_args__ = (
        CheckConstraint("type IN (0, 1)", name="ck_reservations_type"),
        CheckConstraint("status IN ('active','cancelled')", name="ck_reservations_status"),
        Index("idx_reservations_wa_id", "wa_id"),
        Index("idx_reservations_date_time", "date", "time_slot"),
        Index("idx_reservations_status", "status"),
        Index("idx_reservations_wa_id_status", "wa_id", "status"),
        Index("idx_reservations_date_time_status", "date", "time_slot", "status"),
    )


class VacationPeriodModel(Base):
    __tablename__ = "vacation_periods"

    id = Column(Integer, primary_key=True, autoincrement=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=True, index=True)
    duration_days = Column(Integer, nullable=True)  # inclusive days count
    title = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    __table_args__ = (
        CheckConstraint("duration_days IS NULL OR duration_days >= 1", name="ck_vacation_duration_positive"),
        CheckConstraint("end_date IS NULL OR start_date <= end_date", name="ck_vacation_start_before_end"),
        Index("idx_vacations_start", "start_date"),
        Index("idx_vacations_end", "end_date"),
    )

def init_models() -> None:
    """Create database tables if they do not exist."""
    # Ensure auth models are imported so metadata includes them
    try:
        from app.auth import models as _auth_models  # noqa: F401
    except Exception:
        # Auth module may not be present in some environments
        pass
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    """Get a new SQLAlchemy session.

    Returns a session that the caller must close. Prefer usage as:
        with get_session() as session:
            ...
    """
    return SessionLocal()


async def get_async_session() -> AsyncSession:
    """Yield an AsyncSession for async database operations.

    Usage:
        async with get_async_session() as session:
            ...
    """
    async with AsyncSessionLocal() as session:
        yield session


# Initialize tables on import to preserve previous behavior
init_models()

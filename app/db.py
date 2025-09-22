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
    text,
    event,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, scoped_session, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

def _resolve_db_path() -> str:
    """Resolve a stable, hardcoded SQLite path with sane fallbacks.

    Priority:
    1) /app/data/threads_db.sqlite (inside container with mounted volume)
    2) ./data/threads_db.sqlite (when running from project root without container)
    3) ./threads_db.sqlite (last resort in current working directory)
    """
    # Prefer container data volume
    container_data_dir = "/app/data"
    if os.path.isdir(container_data_dir):
        return os.path.join(container_data_dir, "threads_db.sqlite")

    # Prefer local data directory when running outside container
    local_data_dir = os.path.join(os.getcwd(), "data")
    try:
        if not os.path.isdir(local_data_dir):
            # Do not create eagerly; just fallback when missing
            pass
        else:
            return os.path.join(local_data_dir, "threads_db.sqlite")
    except Exception:
        pass

    # Fallback: current working directory
    return os.path.join(os.getcwd(), "threads_db.sqlite")


# Hardcode DB location (do not rely on .env). Still allow ENV override if explicitly set.
DB_PATH = os.environ.get("DB_PATH") or _resolve_db_path()

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
@event.listens_for(engine, "connect")
def _set_sqlite_pragmas(dbapi_connection, _connection_record):  # noqa: ANN001
    """Ensure stable SQLite journaling and sync settings on each connection."""
    try:
        cursor = dbapi_connection.cursor()
        # WAL for durability across restarts with concurrent readers
        cursor.execute("PRAGMA journal_mode=WAL;")
        # Balance safety/perf; NORMAL is fine for WAL
        cursor.execute("PRAGMA synchronous=NORMAL;")
        # Limit WAL growth between checkpoints
        cursor.execute("PRAGMA wal_autocheckpoint=1000;")
        cursor.close()
    except Exception:
        # Best-effort; ignore PRAGMA failures
        try:
            cursor.close()
        except Exception:
            pass


def checkpoint_wal(truncate: bool = True) -> bool:
    """Perform a WAL checkpoint to merge WAL into the main DB file.

    When truncate=True, issue TRUNCATE to clear WAL size on disk.
    Return True on success, False otherwise.
    """
    try:
        with engine.begin() as conn:
            mode = "TRUNCATE" if truncate else "FULL"
            conn.exec_driver_sql(f"PRAGMA wal_checkpoint({mode});")
        return True
    except Exception:
        return False



class CustomerModel(Base):
    __tablename__ = "customers"

    wa_id = Column(String, primary_key=True)
    customer_name = Column(String, nullable=True)
    # Optional age field; keep nullable to avoid forcing data for all existing customers
    age = Column(Integer, nullable=True)

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


class NotificationEventModel(Base):
    __tablename__ = "notification_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False, index=True)
    # ISO 8601 UTC timestamp string (matches websocket broadcast timestamp)
    ts_iso = Column(String, nullable=False, index=True)
    # Raw payload as JSON string (so frontend can reconstruct message-specific text)
    data = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))

    __table_args__ = (
        Index("idx_notification_events_type_ts", "event_type", "ts_iso"),
        Index("idx_notification_events_created_at", "created_at"),
    )


class CustomerDocumentModel(Base):
    __tablename__ = "customer_documents"

    # Use wa_id as the primary key to store a single document per customer
    wa_id = Column(String, ForeignKey("customers.wa_id"), primary_key=True, index=True)
    # Excalidraw JSON is stored as TEXT
    document_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, server_default=func.current_timestamp())
    updated_at = Column(
        DateTime, server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )

    customer = relationship("CustomerModel", backref="document", uselist=False)

    __table_args__ = (
        Index("idx_customer_documents_wa_id", "wa_id"),
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

    # Lightweight migration: ensure 'age' column exists on 'customers'
    try:
        with engine.begin() as conn:
            # Check existing columns
            result = conn.exec_driver_sql("PRAGMA table_info(customers);")
            cols = [row[1] for row in result.fetchall()]  # row[1] is column name
            if "age" not in cols:
                # Add nullable column for age
                conn.exec_driver_sql("ALTER TABLE customers ADD COLUMN age INTEGER NULL;")
    except Exception:
        # Best-effort migration; ignore if fails in read-only contexts
        pass


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

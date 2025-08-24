import os
from typing import Generator

from sqlalchemy import (
    CheckConstraint,
    Column,
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

# Define the SQLite database file path
# Use environment variable if set, otherwise default to current working directory
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.getcwd(), "threads_db.sqlite"))

# SQLAlchemy engine and session factory
engine = create_engine(
    f"sqlite:///{DB_PATH}", echo=False, future=True, connect_args={"check_same_thread": False}
)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True))

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


def init_models() -> None:
    """Create database tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


def get_session() -> Session:
    """Get a new SQLAlchemy session.

    Returns a session that the caller must close. Prefer usage as:
        with get_session() as session:
            ...
    """
    return SessionLocal()


# Initialize tables on import to preserve previous behavior
init_models()

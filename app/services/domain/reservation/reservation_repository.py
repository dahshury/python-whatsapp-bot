from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import and_, select

from app.db import CustomerModel, ReservationModel, get_session

from .reservation_models import Reservation, ReservationType


class ReservationRepository:
    """
    Repository for reservation data access operations.
    Implements repository pattern to abstract data access.
    """

    def __init__(self, timezone: str = "UTC"):
        """Initialize repository with timezone configuration."""
        self.timezone = timezone

    def find_by_wa_id(
        self, wa_id: str, include_past: bool = False
    ) -> list[Reservation]:
        """
        Find all reservations for a customer.

        Args:
            wa_id: WhatsApp ID to search for
            include_past: Whether to include past reservations

        Returns:
            List of Reservation instances
        """
        with get_session() as session:
            stmt = (
                select(
                    ReservationModel.id,
                    ReservationModel.wa_id,
                    ReservationModel.date,
                    ReservationModel.time_slot,
                    ReservationModel.type,
                    ReservationModel.status,
                    ReservationModel.cancelled_at,
                    ReservationModel.created_at,
                    ReservationModel.updated_at,
                    CustomerModel.customer_name,
                )
                .join(CustomerModel, ReservationModel.wa_id == CustomerModel.wa_id)
                .where(
                    and_(
                        ReservationModel.wa_id == wa_id,
                        ReservationModel.status == "active",
                    )
                )
            )
            rows = session.execute(stmt).all()

        reservations: list[Reservation] = []
        now = datetime.now(tz=ZoneInfo(self.timezone))
        for r in rows:
            reservation = Reservation(
                id=r.id,
                wa_id=r.wa_id,
                date=r.date,
                time_slot=r.time_slot,
                type=ReservationType(r.type),
                status=r.status,
                cancelled_at=r.cancelled_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                customer_name=r.customer_name,
            )
            if include_past or reservation.is_future(now):
                reservations.append(reservation)
        return reservations

    def find_active_by_slot(self, date_str: str, time_slot: str) -> list[Reservation]:
        """
        Find active reservations for a specific date and time slot.

        Args:
            date_str: Date in YYYY-MM-DD format
            time_slot: Time slot in 24-hour format (HH:MM)

        Returns:
            List of active reservations for the slot
        """
        with get_session() as session:
            stmt = (
                select(
                    ReservationModel.id,
                    ReservationModel.wa_id,
                    ReservationModel.date,
                    ReservationModel.time_slot,
                    ReservationModel.type,
                    ReservationModel.status,
                    ReservationModel.cancelled_at,
                    ReservationModel.created_at,
                    ReservationModel.updated_at,
                    CustomerModel.customer_name,
                )
                .join(CustomerModel, ReservationModel.wa_id == CustomerModel.wa_id)
                .where(
                    and_(
                        ReservationModel.date == date_str,
                        ReservationModel.time_slot == time_slot,
                        ReservationModel.status == "active",
                    )
                )
            )
            rows = session.execute(stmt).all()

        return [
            Reservation(
                id=r.id,
                wa_id=r.wa_id,
                date=r.date,
                time_slot=r.time_slot,
                type=ReservationType(r.type),
                status=r.status,
                cancelled_at=r.cancelled_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                customer_name=r.customer_name,
            )
            for r in rows
        ]

    def find_cancelled_reservation(
        self, wa_id: str, date_str: str, time_slot: str
    ) -> Reservation | None:
        """
        Find a cancelled reservation that can be reinstated.

        Args:
            wa_id: WhatsApp ID
            date_str: Date in YYYY-MM-DD format
            time_slot: Time slot in 24-hour format

        Returns:
            Cancelled reservation if found, None otherwise
        """
        with get_session() as session:
            stmt = (
                select(
                    ReservationModel.id,
                    ReservationModel.wa_id,
                    ReservationModel.date,
                    ReservationModel.time_slot,
                    ReservationModel.type,
                    ReservationModel.status,
                    ReservationModel.cancelled_at,
                    ReservationModel.created_at,
                    ReservationModel.updated_at,
                    CustomerModel.customer_name,
                )
                .join(CustomerModel, ReservationModel.wa_id == CustomerModel.wa_id)
                .where(
                    and_(
                        ReservationModel.wa_id == wa_id,
                        ReservationModel.date == date_str,
                        ReservationModel.time_slot == time_slot,
                        ReservationModel.status == "cancelled",
                    )
                )
            )
            row = session.execute(stmt).first()

        if row:
            r = row
            return Reservation(
                id=r.id,
                wa_id=r.wa_id,
                date=r.date,
                time_slot=r.time_slot,
                type=ReservationType(r.type),
                status=r.status,
                cancelled_at=r.cancelled_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                customer_name=r.customer_name,
            )
        return None

    def find_by_id(self, reservation_id: int) -> Reservation | None:
        """
        Find a reservation by its ID.

        Args:
            reservation_id: The ID of the reservation.

        Returns:
            Reservation instance if found, None otherwise.
        """
        with get_session() as session:
            stmt = (
                select(
                    ReservationModel.id,
                    ReservationModel.wa_id,
                    ReservationModel.date,
                    ReservationModel.time_slot,
                    ReservationModel.type,
                    ReservationModel.status,
                    ReservationModel.cancelled_at,
                    ReservationModel.created_at,
                    ReservationModel.updated_at,
                    CustomerModel.customer_name,
                )
                .join(
                    CustomerModel,
                    ReservationModel.wa_id == CustomerModel.wa_id,
                    isouter=True,
                )
                .where(ReservationModel.id == reservation_id)
            )
            row = session.execute(stmt).first()
        if row:
            r = row
            return Reservation(
                id=r.id,
                wa_id=r.wa_id,
                date=r.date,
                time_slot=r.time_slot,
                type=ReservationType(r.type),
                status=r.status,
                cancelled_at=r.cancelled_at,
                created_at=r.created_at,
                updated_at=r.updated_at,
                customer_name=r.customer_name,
            )
        return None

    def save(self, reservation: Reservation) -> int:
        """
        Save a new reservation to database.

        Args:
            reservation: Reservation instance to save

        Returns:
            ID of the newly created reservation
        """
        import logging

        logger = logging.getLogger(self.__class__.__name__)

        try:
            with get_session() as session:
                db_obj = ReservationModel(
                    wa_id=reservation.wa_id,
                    date=reservation.date,
                    time_slot=reservation.time_slot,
                    type=int(
                        reservation.type.value
                        if hasattr(reservation.type, "value")
                        else int(reservation.type)
                    ),
                    status=reservation.status,
                )

                logger.debug(
                    f"Saving reservation: wa_id={reservation.wa_id}, type={reservation.type}, date={reservation.date}, time={reservation.time_slot}"
                )

                session.add(db_obj)
                session.commit()
                session.refresh(db_obj)

                logger.debug(f"Successfully saved reservation with ID: {db_obj.id}")
                return int(db_obj.id)

        except Exception as e:
            logger.error(
                f"Failed to save reservation: wa_id={reservation.wa_id}, type={reservation.type}, error={e}",
                exc_info=True,
            )
            raise  # Re-raise the exception so it can be handled by the service layer

    def update(self, reservation: Reservation) -> bool:
        """
        Update an existing reservation.

        Args:
            reservation: Reservation instance with updates

        Returns:
            True if update was successful, False otherwise
        """
        with get_session() as session:
            result = (
                session.query(ReservationModel)
                .filter(ReservationModel.id == reservation.id)
                .update(
                    {
                        ReservationModel.date: reservation.date,
                        ReservationModel.time_slot: reservation.time_slot,
                        ReservationModel.type: int(
                            reservation.type.value
                            if hasattr(reservation.type, "value")
                            else int(reservation.type)
                        ),
                        ReservationModel.status: reservation.status,
                        ReservationModel.cancelled_at: reservation.cancelled_at,
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            return result > 0

    def cancel_by_id(self, reservation_id: int) -> bool:
        """
        Cancel a reservation by its ID.

        Args:
            reservation_id: The ID of the reservation to cancel.

        Returns:
            True if cancellation was successful, False otherwise.
        """
        with get_session() as session:
            result = (
                session.query(ReservationModel)
                .filter(
                    ReservationModel.id == reservation_id,
                    ReservationModel.status == "active",
                )
                .update(
                    {
                        ReservationModel.status: "cancelled",
                        ReservationModel.cancelled_at: datetime.utcnow(),
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            return result > 0

    def reinstate_by_id(self, reservation_id: int) -> bool:
        """
        Reinstate a cancelled reservation by its ID.

        Args:
            reservation_id: The ID of the reservation to reinstate.

        Returns:
            True if reinstatement was successful, False otherwise.
        """
        with get_session() as session:
            result = (
                session.query(ReservationModel)
                .filter(
                    ReservationModel.id == reservation_id,
                    ReservationModel.status == "cancelled",
                )
                .update(
                    {
                        ReservationModel.status: "active",
                        ReservationModel.cancelled_at: None,
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            return result > 0

    def cancel_by_wa_id(self, wa_id: str, date_str: str | None = None) -> int:
        """
        Cancel reservations for a customer.

        Args:
            wa_id: WhatsApp ID
            date_str: Optional specific date to cancel. If None, cancels all active reservations

        Returns:
            Number of reservations cancelled
        """
        with get_session() as session:
            if date_str is None:
                result = (
                    session.query(ReservationModel)
                    .filter(
                        ReservationModel.wa_id == wa_id,
                        ReservationModel.status == "active",
                    )
                    .update(
                        {
                            ReservationModel.status: "cancelled",
                            ReservationModel.cancelled_at: datetime.utcnow(),
                        },
                        synchronize_session=False,
                    )
                )
            else:
                result = (
                    session.query(ReservationModel)
                    .filter(
                        ReservationModel.wa_id == wa_id,
                        ReservationModel.date == date_str,
                        ReservationModel.status == "active",
                    )
                    .update(
                        {
                            ReservationModel.status: "cancelled",
                            ReservationModel.cancelled_at: datetime.utcnow(),
                        },
                        synchronize_session=False,
                    )
                )
            session.commit()
            return int(result)

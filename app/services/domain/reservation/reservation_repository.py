from datetime import datetime
from typing import List, Optional

from zoneinfo import ZoneInfo

from app.database import get_connection

from .reservation_models import Reservation, ReservationType


class ReservationRepository:
    """
    Repository for reservation data access operations.
    Implements repository pattern to abstract data access using PostgreSQL.
    """

    def __init__(self, timezone: str = "UTC"):
        """Initialize repository with timezone configuration."""
        self.timezone = timezone

    async def find_by_wa_id(
        self, wa_id: str, include_past: bool = False
    ) -> List[Reservation]:
        """
        Find all reservations for a customer.

        Args:
            wa_id: WhatsApp ID to search for
            include_past: Whether to include past reservations

        Returns:
            List of Reservation instances
        """
        connection = await get_connection()
        try:
            rows = await connection.fetchall(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r
                   JOIN customers c ON r.wa_id = c.wa_id
                   WHERE r.wa_id = $1 AND r.status = 'active'""",
                [wa_id],
            )

            reservations = []
            now = datetime.now(tz=ZoneInfo(self.timezone))

            for row in rows:
                reservation = Reservation(
                    id=row["id"],
                    wa_id=row["wa_id"],
                    date=row["date"],
                    time_slot=row["time_slot"],
                    type=ReservationType(row["type"]),
                    status=row["status"],
                    cancelled_at=row["cancelled_at"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    customer_name=row["customer_name"],
                )

                # Include based on past/future filter
                if include_past or reservation.is_future(now):
                    reservations.append(reservation)

            return reservations

        except Exception as e:
            raise RuntimeError(f"Error finding reservations for {wa_id}") from e
        else:
            return reservations

    async def find_active_by_slot(
        self, date_str: str, time_slot: str
    ) -> List[Reservation]:
        """
        Find active reservations for a specific date and time slot.

        Args:
            date_str: Date in YYYY-MM-DD format
            time_slot: Time slot in 24-hour format (HH:MM)

        Returns:
            List of active reservations for the slot
        """
        connection = await get_connection()
        try:
            rows = await connection.fetchall(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r
                   JOIN customers c ON r.wa_id = c.wa_id
                   WHERE r.date = $1 AND r.time_slot = $2 AND r.status = 'active'""",
                [date_str, time_slot],
            )

            return [
                Reservation(
                    id=row["id"],
                    wa_id=row["wa_id"],
                    date=row["date"],
                    time_slot=row["time_slot"],
                    type=ReservationType(row["type"]),
                    status=row["status"],
                    cancelled_at=row["cancelled_at"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    customer_name=row["customer_name"],
                )
                for row in rows
            ]

        except Exception as e:
            raise RuntimeError(f"Error finding reservations for slot {date_str} {time_slot}") from e

    async def find_cancelled_reservation(
        self, wa_id: str, date_str: str, time_slot: str
    ) -> Optional[Reservation]:
        """
        Find a cancelled reservation that can be reinstated.

        Args:
            wa_id: WhatsApp ID
            date_str: Date in YYYY-MM-DD format
            time_slot: Time slot in 24-hour format

        Returns:
            Cancelled reservation if found, None otherwise
        """
        connection = await get_connection()
        try:
            row = await connection.fetchone(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r
                   JOIN customers c ON r.wa_id = c.wa_id
                   WHERE r.wa_id = $1 AND r.date = $2 AND r.time_slot = $3 AND r.status = 'cancelled'""",
                [wa_id, date_str, time_slot],
            )

            if row:
                return Reservation(
                    id=row["id"],
                    wa_id=row["wa_id"],
                    date=row["date"],
                    time_slot=row["time_slot"],
                    type=ReservationType(row["type"]),
                    status=row["status"],
                    cancelled_at=row["cancelled_at"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    customer_name=row["customer_name"],
                )

        except Exception as e:
            raise RuntimeError("Error finding cancelled reservation") from e
        else:
            return None

    async def find_by_id(self, reservation_id: int) -> Optional[Reservation]:
        """
        Find a reservation by its ID.

        Args:
            reservation_id: The ID of the reservation.

        Returns:
            Reservation instance if found, None otherwise.
        """
        connection = await get_connection()
        try:
            row = await connection.fetchone(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r
                   LEFT JOIN customers c ON r.wa_id = c.wa_id
                   WHERE r.id = $1""",
                [reservation_id],
            )

            if row:
                return Reservation(
                    id=row["id"],
                    wa_id=row["wa_id"],
                    date=row["date"],
                    time_slot=row["time_slot"],
                    type=ReservationType(row["type"]),
                    status=row["status"],
                    cancelled_at=row["cancelled_at"],
                    created_at=row["created_at"],
                    updated_at=row["updated_at"],
                    customer_name=row[
                        "customer_name"
                    ],  # May be None if customer deleted or inconsistent state
                )
            else:
            return None
        except Exception as e:
            raise RuntimeError(f"Error finding reservation by ID {reservation_id}") from e

    async def save(self, reservation: Reservation) -> int:
        """
        Save a new reservation to database.

        Args:
            reservation: Reservation instance to save

        Returns:
            ID of the newly created reservation
        """
        connection = await get_connection()
        try:
            conn = await connection.connect()
            async with conn.transaction():
                await connection.execute(
                    """INSERT INTO reservations (wa_id, date, time_slot, type, status, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                       RETURNING id""",
                    [
                        reservation.wa_id,
                        reservation.date,
                        reservation.time_slot,
                        reservation.type.value,
                        reservation.status,
                    ],
                )

                # Get the returned ID
                row = await connection.fetchone(
                    """SELECT id FROM reservations
                       WHERE wa_id = $1 AND date = $2 AND time_slot = $3 AND type = $4
                       ORDER BY created_at DESC LIMIT 1""",
                    [
                        reservation.wa_id,
                        reservation.date,
                        reservation.time_slot,
                        reservation.type.value,
                    ],
                )

                return row["id"] if row else None

        except Exception as e:
            raise RuntimeError("Error saving reservation") from e

    async def update(self, reservation: Reservation) -> bool:
        """
        Update an existing reservation.

        Args:
            reservation: Reservation instance with updates

        Returns:
            True if update was successful, False otherwise
        """
        connection = await get_connection()
        try:
            conn = await connection.connect()
            async with conn.transaction():
                result = await connection.execute(
                    """UPDATE reservations
                       SET date = $1, time_slot = $2, type = $3, status = $4, cancelled_at = $5, updated_at = CURRENT_TIMESTAMP
                       WHERE id = $6""",
                    [
                        reservation.date,
                        reservation.time_slot,
                        reservation.type.value,
                        reservation.status,
                        reservation.cancelled_at,
                        reservation.id,
                    ],
                )

                return result.get("changes", 0) > 0

        except Exception as e:
            raise RuntimeError("Error updating reservation") from e

    async def cancel_by_id(self, reservation_id: int) -> bool:
        """
        Cancel a reservation by its ID.

        Args:
            reservation_id: The ID of the reservation to cancel.

        Returns:
            True if cancellation was successful, False otherwise.
        """
        connection = await get_connection()
        try:
            conn = await connection.connect()
            async with conn.transaction():
                result = await connection.execute(
                    """UPDATE reservations
                       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                       WHERE id = $1 AND status = 'active'""",
                    [reservation_id],
                )

                return result.get("changes", 0) > 0

        except Exception as e:
            raise RuntimeError("Error cancelling reservation") from e

    async def reinstate_by_id(self, reservation_id: int) -> bool:
        """
        Reinstate a cancelled reservation by its ID.

        Args:
            reservation_id: The ID of the reservation to reinstate.

        Returns:
            True if reinstatement was successful, False otherwise.
        """
        connection = await get_connection()
        try:
            conn = await connection.connect()
            async with conn.transaction():
                result = await connection.execute(
                    """UPDATE reservations
                       SET status = 'active', cancelled_at = NULL, updated_at = CURRENT_TIMESTAMP
                       WHERE id = $1 AND status = 'cancelled'""",
                    [reservation_id],
                )

                return result.get("changes", 0) > 0

        except Exception as e:
            raise RuntimeError("Error reinstating reservation") from e

    async def cancel_by_wa_id(self, wa_id: str, date_str: Optional[str] = None) -> int:
        """
        Cancel reservations for a customer.

        Args:
            wa_id: WhatsApp ID
            date_str: Optional specific date to cancel. If None, cancels all active reservations

        Returns:
            Number of reservations cancelled
        """
        connection = await get_connection()
        try:
            conn = await connection.connect()
            async with conn.transaction():
                if date_str is None:
                    # Cancel all active reservations
                    result = await connection.execute(
                        """UPDATE reservations
                           SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                           WHERE wa_id = $1 AND status = 'active'""",
                        [wa_id],
                    )
                else:
                    # Cancel reservations for specific date
                    result = await connection.execute(
                        """UPDATE reservations
                           SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                           WHERE wa_id = $1 AND date = $2 AND status = 'active'""",
                        [wa_id, date_str],
                    )

                return result.get("changes", 0)

        except Exception as e:
            raise RuntimeError(f"Error cancelling reservations for {wa_id}") from e

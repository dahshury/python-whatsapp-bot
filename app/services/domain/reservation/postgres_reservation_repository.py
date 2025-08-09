"""
PostgreSQL Reservation Repository

This repository handles reservation data operations using PostgreSQL.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from zoneinfo import ZoneInfo

from app.database import get_connection
from app.infrastructure.logging import get_service_logger
from app.services.websocket_manager import broadcast_reservation_update

from .reservation_models import Reservation, ReservationType


# Set up domain-specific logger
logger = get_service_logger()


class ReservationRepository:
    """Reservation repository with PostgreSQL support"""

    async def create_reservation(
        self, wa_id: str, date: str, time_slot: str, type: int
    ) -> Optional[int]:
        """
        Create a new reservation

        Args:
            wa_id: Customer's WhatsApp ID
            date: Reservation date
            time_slot: Time slot for the reservation
            type: Reservation type (0 or 1)

        Returns:
            Reservation ID if successful, None otherwise
        """
        try:
            connection = await get_connection()

            result = await connection.fetchone(
                """
                INSERT INTO reservations (wa_id, date, time_slot, type, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
            """,
                [wa_id, date, time_slot, type],
            )

            if result:
                reservation_id = result["id"]

                # Broadcast update via WebSocket
                await broadcast_reservation_update(
                    "created",
                    {
                        "id": reservation_id,
                        "wa_id": wa_id,
                        "date": date,
                        "time_slot": time_slot,
                        "type": type,
                        "status": "active",
                    }
                )

                return reservation_id
            else:
                return None
        except Exception:
            logger.exception("Error creating reservation")
            return None

    async def get_reservation(self, reservation_id: int) -> Optional[Reservation]:
        """
        Get a reservation by ID

        Args:
            reservation_id: ID of the reservation

        Returns:
            Reservation object if found, None otherwise
        """
        try:
            connection = await get_connection()

            result = await connection.fetchone(
                """
                SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                FROM reservations
                WHERE id = $1
            """,
                [reservation_id],
            )

            if result:
                return Reservation(
                    id=result["id"],
                    wa_id=result["wa_id"],
                    date=result["date"],
                    time_slot=result["time_slot"],
                    type=ReservationType(result["type"]),
                    status=result["status"],
                    cancelled_at=result["cancelled_at"],
                    created_at=result["created_at"],
                    updated_at=result["updated_at"],
                )
        except Exception:
            logger.exception("Error getting reservation")
            return None
        else:
            return None

    async def get_reservations_by_customer(
        self, wa_id: str, include_cancelled: bool = False
    ) -> List[Reservation]:
        """
        Get all reservations for a customer

        Args:
            wa_id: Customer's WhatsApp ID
            include_cancelled: Whether to include cancelled reservations

        Returns:
            List of Reservation objects
        """
        try:
            connection = await get_connection()

            if include_cancelled:
                query = """
                    SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                    FROM reservations
                    WHERE wa_id = $1
                    ORDER BY date DESC, time_slot DESC
                """
                params = [wa_id]
            else:
                query = """
                    SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                    FROM reservations
                    WHERE wa_id = $1 AND status = 'active'
                    ORDER BY date DESC, time_slot DESC
                """
                params = [wa_id]

            results = await connection.fetchall(query, params)

            reservations = [
                Reservation(
                    id=result["id"],
                    wa_id=result["wa_id"],
                    date=result["date"],
                    time_slot=result["time_slot"],
                    type=ReservationType(result["type"]),
                    status=result["status"],
                    cancelled_at=result["cancelled_at"],
                    created_at=result["created_at"],
                    updated_at=result["updated_at"],
                )
                for result in results
            ]

        except Exception:
            logger.exception("Error getting reservations by customer")
            return []
        else:
            return reservations

    async def get_reservations_by_date(
        self, target_date: str, include_cancelled: bool = False
    ) -> List[Reservation]:
        """
        Get all reservations for a specific date

        Args:
            target_date: Date to get reservations for
            include_cancelled: Whether to include cancelled reservations

        Returns:
            List of Reservation objects
        """
        try:
            connection = await get_connection()

            if include_cancelled:
                query = """
                    SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                    FROM reservations
                    WHERE date = $1
                    ORDER BY time_slot ASC
                """
                params = [target_date]
            else:
                query = """
                    SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                    FROM reservations
                    WHERE date = $1 AND status = 'active'
                    ORDER BY time_slot ASC
                """
                params = [target_date]

            results = await connection.fetchall(query, params)

            reservations = [
                Reservation(
                    id=result["id"],
                    wa_id=result["wa_id"],
                    date=result["date"],
                    time_slot=result["time_slot"],
                    type=ReservationType(result["type"]),
                    status=result["status"],
                    cancelled_at=result["cancelled_at"],
                    created_at=result["created_at"],
                    updated_at=result["updated_at"],
                )
                for result in results
            ]

        except Exception:
            logger.exception("Error getting reservations by date")
            return []
        else:
            return reservations

    async def cancel_reservation(self, reservation_id: int) -> bool:
        """
        Cancel a reservation

        Args:
            reservation_id: ID of the reservation to cancel

        Returns:
            True if successful, False otherwise
        """
        try:
            connection = await get_connection()

            # Get reservation details before cancelling
            reservation = await self.get_reservation(reservation_id)
            if not reservation:
                return False

            result = await connection.execute(
                """
                UPDATE reservations
                SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND status = 'active'
            """,
                [reservation_id],
            )

            if result.get("changes", 0) > 0:
                # Broadcast update via WebSocket
                await broadcast_reservation_update(
                    "cancelled",
                    {
                        "id": reservation_id,
                        "wa_id": reservation.wa_id,
                        "date": reservation.date,
                        "time_slot": reservation.time_slot,
                        "type": reservation.type.value,
                        "status": "cancelled",
                    }
                )
                return True
            else:
            return False

        except Exception:
            logger.exception("Error cancelling reservation")
            return False

    async def update_reservation(
        self,
        reservation_id: int,
        date: Optional[str] = None,
        time_slot: Optional[str] = None,
        type: Optional[int] = None,
    ) -> bool:
        """
        Update a reservation

        Args:
            reservation_id: ID of the reservation to update
            date: New date (optional)
            time_slot: New time slot (optional)
            type: New type (optional)

        Returns:
            True if successful, False otherwise
        """
        try:
            connection = await get_connection()

            # Build dynamic update query
            update_fields = []
            params = []
            param_count = 1

            if date is not None:
                update_fields.append(f"date = ${param_count}")
                params.append(date)
                param_count += 1

            if time_slot is not None:
                update_fields.append(f"time_slot = ${param_count}")
                params.append(time_slot)
                param_count += 1

            if type is not None:
                update_fields.append(f"type = ${param_count}")
                params.append(type)
                param_count += 1

            if not update_fields:
                return False  # Nothing to update

            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.append(reservation_id)  # Last parameter is the reservation ID

            query = f"""
                UPDATE reservations
                SET {", ".join(update_fields)}
                WHERE id = ${param_count} AND status = 'active'
            """

            result = await connection.execute(query, params)

            if result.get("changes", 0) > 0:
                # Get updated reservation for broadcast
                updated_reservation = await self.get_reservation(reservation_id)
                if updated_reservation:
                    await broadcast_reservation_update(
                        "updated",
                        {
                            "id": updated_reservation.id,
                            "wa_id": updated_reservation.wa_id,
                            "date": updated_reservation.date,
                            "time_slot": updated_reservation.time_slot,
                            "type": updated_reservation.type.value,
                            "status": updated_reservation.status,
                        }
                    )
                return True
            else:
            return False

        except Exception:
            logger.exception("Error updating reservation")
            return False

    async def delete_reservation(self, reservation_id: int) -> bool:
        """
        Permanently delete a reservation

        Args:
            reservation_id: ID of the reservation to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            connection = await get_connection()

            # Get reservation details before deleting
            reservation = await self.get_reservation(reservation_id)
            if not reservation:
                return False

            result = await connection.execute(
                """
                DELETE FROM reservations WHERE id = $1
            """,
                [reservation_id],
            )

            if result.get("changes", 0) > 0:
                # Broadcast update via WebSocket
                await broadcast_reservation_update(
                    "deleted",
                    {
                        "id": reservation_id,
                        "wa_id": reservation.wa_id,
                        "date": reservation.date,
                        "time_slot": reservation.time_slot,
                        "type": reservation.type.value,
                        "status": "deleted",
                    }
                )
                return True
            else:
            return False

        except Exception:
            logger.exception("Error deleting reservation")
            return False

    async def get_all_reservations(
        self, limit: int = 100, offset: int = 0, include_cancelled: bool = True
    ) -> List[Reservation]:
        """
        Get all reservations with pagination

        Args:
            limit: Maximum number of reservations to return
            offset: Number of reservations to skip
            include_cancelled: Whether to include cancelled reservations

        Returns:
            List of Reservation objects
        """
        try:
            connection = await get_connection()

            if include_cancelled:
                query = """
                    SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                    FROM reservations
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2
                """
                params = [limit, offset]
            else:
                query = """
                    SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at
                    FROM reservations
                    WHERE status = 'active'
                    ORDER BY created_at DESC
                    LIMIT $1 OFFSET $2
                """
                params = [limit, offset]

            results = await connection.fetchall(query, params)

            reservations = [
                Reservation(
                    id=result["id"],
                    wa_id=result["wa_id"],
                    date=result["date"],
                    time_slot=result["time_slot"],
                    type=ReservationType(result["type"]),
                    status=result["status"],
                    cancelled_at=result["cancelled_at"],
                    created_at=result["created_at"],
                    updated_at=result["updated_at"],
                )
                for result in results
            ]

        except Exception:
            logger.exception("Error getting all reservations")
            return []
        else:
            return reservations

    async def get_reservation_stats(self) -> Dict[str, Any]:
        """
        Get reservation statistics

        Returns:
            Dict containing reservation statistics
        """
        try:
            connection = await get_connection()

            # Total reservations
            total_result = await connection.fetchone(
                "SELECT COUNT(*) as total FROM reservations"
            )
            total_reservations = total_result["total"] if total_result else 0

            # Active reservations
            active_result = await connection.fetchone("""
                SELECT COUNT(*) as active FROM reservations WHERE status = 'active'
            """)
            active_reservations = active_result["active"] if active_result else 0

            # Cancelled reservations
            cancelled_result = await connection.fetchone("""
                SELECT COUNT(*) as cancelled FROM reservations WHERE status = 'cancelled'
            """)
            cancelled_reservations = (
                cancelled_result["cancelled"] if cancelled_result else 0
            )

            # Today's reservations
            today = datetime.now(ZoneInfo("Asia/Riyadh")).date().strftime("%Y-%m-%d")
            today_result = await connection.fetchone(
                """
                SELECT COUNT(*) as today FROM reservations
                WHERE date = $1 AND status = 'active'
            """,
                [today],
            )
            today_reservations = today_result["today"] if today_result else 0

        except Exception:
            logger.exception("Error getting reservation stats")
            return {"error": "Error getting reservation stats"}
        else:
            return {
                "total_reservations": total_reservations,
                "active_reservations": active_reservations,
                "cancelled_reservations": cancelled_reservations,
                "today_reservations": today_reservations,
            }


# Singleton pattern for repository instance
class ReservationRepositoryManager:
    """Singleton manager for reservation repository instances"""
    _instance = None
    _repository = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_repository(self) -> ReservationRepository:
        """Get the singleton reservation repository instance"""
        if self._repository is None:
            self._repository = ReservationRepository()
        return self._repository


async def get_reservation_repository() -> ReservationRepository:
    """Get the global reservation repository instance"""
    manager = ReservationRepositoryManager()
    return await manager.get_repository()

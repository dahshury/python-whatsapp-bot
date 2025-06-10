import sqlite3
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo
from app.db import get_connection
from .reservation_models import Reservation, ReservationType


class ReservationRepository:
    """
    Repository for reservation data access operations.
    Implements repository pattern to abstract data access.
    """
    
    def __init__(self, timezone: str = "UTC"):
        """Initialize repository with timezone configuration."""
        self.timezone = timezone
    
    def find_by_wa_id(self, wa_id: str, include_past: bool = False) -> List[Reservation]:
        """
        Find all reservations for a customer.
        
        Args:
            wa_id: WhatsApp ID to search for
            include_past: Whether to include past reservations
            
        Returns:
            List of Reservation instances
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r 
                   JOIN customers c ON r.wa_id = c.wa_id 
                   WHERE r.wa_id = ? AND r.status = 'active'""",
                (wa_id,)
            )
            rows = cursor.fetchall()
            
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
                    customer_name=row["customer_name"]
                )
                
                # Include based on past/future filter
                if include_past or reservation.is_future(now):
                    reservations.append(reservation)
            
            return reservations
            
        finally:
            conn.close()
    
    def find_active_by_slot(self, date_str: str, time_slot: str) -> List[Reservation]:
        """
        Find active reservations for a specific date and time slot.
        
        Args:
            date_str: Date in YYYY-MM-DD format
            time_slot: Time slot in 24-hour format (HH:MM)
            
        Returns:
            List of active reservations for the slot
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r 
                   JOIN customers c ON r.wa_id = c.wa_id 
                   WHERE r.date = ? AND r.time_slot = ? AND r.status = 'active'""",
                (date_str, time_slot)
            )
            rows = cursor.fetchall()
            
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
                    customer_name=row["customer_name"]
                )
                for row in rows
            ]
            
        finally:
            conn.close()
    
    def find_cancelled_reservation(self, wa_id: str, date_str: str, time_slot: str) -> Optional[Reservation]:
        """
        Find a cancelled reservation that can be reinstated.
        
        Args:
            wa_id: WhatsApp ID
            date_str: Date in YYYY-MM-DD format
            time_slot: Time slot in 24-hour format
            
        Returns:
            Cancelled reservation if found, None otherwise
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r 
                   JOIN customers c ON r.wa_id = c.wa_id 
                   WHERE r.wa_id = ? AND r.date = ? AND r.time_slot = ? AND r.status = 'cancelled'""",
                (wa_id, date_str, time_slot)
            )
            row = cursor.fetchone()
            
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
                    customer_name=row["customer_name"]
                )
            return None
            
        finally:
            conn.close()
    
    def find_by_id(self, reservation_id: int) -> Optional[Reservation]:
        """
        Find a reservation by its ID.
        
        Args:
            reservation_id: The ID of the reservation.
            
        Returns:
            Reservation instance if found, None otherwise.
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """SELECT r.id, r.wa_id, r.date, r.time_slot, r.type, r.status,
                          r.cancelled_at, r.created_at, r.updated_at, c.customer_name
                   FROM reservations r
                   LEFT JOIN customers c ON r.wa_id = c.wa_id
                   WHERE r.id = ?""",
                (reservation_id,)
            )
            row = cursor.fetchone()
            
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
                    customer_name=row["customer_name"] # May be None if customer deleted or inconsistent state
                )
            return None
        finally:
            conn.close()
    
    def save(self, reservation: Reservation) -> int:
        """
        Save a new reservation to database.
        
        Args:
            reservation: Reservation instance to save
            
        Returns:
            ID of the newly created reservation
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("BEGIN IMMEDIATE")
            
            cursor.execute(
                """INSERT INTO reservations (wa_id, date, time_slot, type, status, created_at, updated_at) 
                   VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                (reservation.wa_id, reservation.date, reservation.time_slot, 
                 reservation.type.value, reservation.status)
            )
            
            reservation_id = cursor.lastrowid
            conn.commit()
            return reservation_id
            
        except sqlite3.Error:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def update(self, reservation: Reservation) -> bool:
        """
        Update an existing reservation.
        
        Args:
            reservation: Reservation instance with updates
            
        Returns:
            True if update was successful, False otherwise
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("BEGIN IMMEDIATE")
            
            cursor.execute(
                """UPDATE reservations 
                   SET date = ?, time_slot = ?, type = ?, status = ?, cancelled_at = ?, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ?""",
                (reservation.date, reservation.time_slot, reservation.type.value, 
                 reservation.status, reservation.cancelled_at, reservation.id)
            )
            
            success = cursor.rowcount > 0
            if success:
                conn.commit()
            else:
                conn.rollback()
                
            return success
            
        except sqlite3.Error:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def cancel_by_id(self, reservation_id: int) -> bool:
        """
        Cancel a reservation by its ID.
        
        Args:
            reservation_id: The ID of the reservation to cancel.
            
        Returns:
            True if cancellation was successful, False otherwise.
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("BEGIN IMMEDIATE")
            
            cursor.execute(
                """UPDATE reservations
                   SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND status = 'active'""",
                (reservation_id,)
            )
            
            success = cursor.rowcount > 0
            if success:
                conn.commit()
            else:
                conn.rollback() # Rollback if no row was updated (e.g., already cancelled or not found)
            return success
            
        except sqlite3.Error:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def reinstate_by_id(self, reservation_id: int) -> bool:
        """
        Reinstate a cancelled reservation by its ID.
        
        Args:
            reservation_id: The ID of the reservation to reinstate.
            
        Returns:
            True if reinstatement was successful, False otherwise.
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("BEGIN IMMEDIATE")
            
            cursor.execute(
                """UPDATE reservations
                   SET status = 'active', cancelled_at = NULL, updated_at = CURRENT_TIMESTAMP
                   WHERE id = ? AND status = 'cancelled'""",
                (reservation_id,)
            )
            
            success = cursor.rowcount > 0
            if success:
                conn.commit()
            else:
                conn.rollback() # Rollback if no row was updated (e.g., already active or not found)
            return success
            
        except sqlite3.Error:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def cancel_by_wa_id(self, wa_id: str, date_str: Optional[str] = None) -> int:
        """
        Cancel reservations for a customer.
        
        Args:
            wa_id: WhatsApp ID
            date_str: Optional specific date to cancel. If None, cancels all active reservations
            
        Returns:
            Number of reservations cancelled
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("BEGIN IMMEDIATE")
            
            if date_str is None:
                # Cancel all active reservations
                cursor.execute(
                    """UPDATE reservations 
                       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                       WHERE wa_id = ? AND status = 'active'""",
                    (wa_id,)
                )
            else:
                # Cancel reservations for specific date
                cursor.execute(
                    """UPDATE reservations 
                       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                       WHERE wa_id = ? AND date = ? AND status = 'active'""",
                    (wa_id, date_str)
                )
            
            cancelled_count = cursor.rowcount
            
            if cancelled_count > 0:
                conn.commit()
            else:
                conn.rollback()
                
            return cancelled_count
            
        except sqlite3.Error:
            conn.rollback()
            raise
        finally:
            conn.close() 
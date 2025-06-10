from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from enum import IntEnum


class ReservationType(IntEnum):
    """Enumeration for reservation types."""
    CHECK_UP = 0
    FOLLOW_UP = 1


class ReservationStatus(IntEnum):
    """Enumeration for reservation statuses."""
    ACTIVE = 0
    CANCELLED = 1


@dataclass
class Reservation:
    """
    Reservation domain entity representing a medical appointment.
    """
    wa_id: str
    date: str  # YYYY-MM-DD format
    time_slot: str  # 24-hour format (HH:MM)
    type: ReservationType
    status: str = 'active'
    id: Optional[int] = None
    cancelled_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    
    def __post_init__(self):
        """Validate reservation data after initialization."""
        if not self.wa_id:
            raise ValueError("Reservation wa_id cannot be empty")
        if not self.date:
            raise ValueError("Reservation date cannot be empty")
        if not self.time_slot:
            raise ValueError("Reservation time_slot cannot be empty")
        
        # Ensure type is proper enum
        if isinstance(self.type, int):
            self.type = ReservationType(self.type)
    
    def is_future(self, now: datetime) -> bool:
        """
        Check if this reservation is in the future.
        
        Args:
            now: Current datetime with timezone
            
        Returns:
            True if reservation is in the future
        """
        from datetime import datetime, time
        from zoneinfo import ZoneInfo
        from app.utils.service_utils import parse_time
        
        # Parse reservation date and time
        reservation_date = datetime.strptime(self.date, "%Y-%m-%d").date()
        
        # Use our robust parse_time function to handle various time formats
        try:
            time_slot_24h = parse_time(self.time_slot, to_24h=True)
            slot_time = datetime.strptime(time_slot_24h, "%H:%M").time()
        except (ValueError, Exception) as e:
            # If we can't parse the time, log error and assume it's in the future to be safe
            import logging
            logging.error(f"Could not parse time slot '{self.time_slot}' in reservation {self.id}: {e}")
            return True
        
        slot_start_datetime = datetime.combine(
            reservation_date, 
            slot_time, 
            tzinfo=now.tzinfo
        )
        
        return now < slot_start_datetime
    
    def cancel(self) -> None:
        """Cancel this reservation."""
        self.status = 'cancelled'
        self.cancelled_at = datetime.utcnow()
    
    def activate(self) -> None:
        """Activate this reservation."""
        self.status = 'active'
        self.cancelled_at = None 
from dataclasses import dataclass
from datetime import date, time
from enum import Enum


class ReservationType(Enum):
    CHECKUP = 0
    FOLLOWUP = 1


@dataclass(frozen=True)
class Reservation:
    """
    Core domain entity representing a reservation.
    """
    customer_id: str        # Unique identifier (e.g. WhatsApp ID or phone number)
    customer_name: str      # Name of the customer
    date: date              # Date of reservation
    time_slot: time         # Start time of reservation slot
    reservation_type: ReservationType  # Type of reservation (checkup vs follow-up)
    cancelled: bool = False # Flag indicating if this reservation is cancelled 
from abc import ABC, abstractmethod
from typing import List
from datetime import date, time

from app.domain.reservation import Reservation, ReservationType

class ReservationRepository(ABC):
    @abstractmethod
    def list_reservations(self, future_only: bool = False) -> List[Reservation]:
        """List reservations; if future_only, only those on or after today."""
        pass

    @abstractmethod
    def get_reservations_by_customer(self, customer_id: str) -> List[Reservation]:
        """Retrieve all reservations for a given customer."""
        pass

    @abstractmethod
    def add(self, reservation: Reservation) -> Reservation:
        """Persist a new reservation."""
        pass

    @abstractmethod
    def update(self, reservation: Reservation) -> Reservation:
        """Persist updates to an existing reservation."""
        pass

    @abstractmethod
    def cancel(self, reservation: Reservation) -> Reservation:
        """Mark a reservation as cancelled."""
        pass

class ReservationService(ABC):
    @abstractmethod
    def reserve(self, reservation: Reservation, max_reservations: int = 6) -> Reservation:
        """Business logic to create a reservation with capacity constraints."""
        pass

    @abstractmethod
    def modify(self, reservation: Reservation, date: date, time_slot: time, reservation_type: ReservationType) -> Reservation:
        """Business logic to modify an existing reservation."""
        pass

    @abstractmethod
    def cancel(self, reservation_id: str) -> Reservation:
        """Business logic to cancel a reservation by ID."""
        pass 
from dataclasses import asdict, dataclass
from typing import List, Optional
from datetime import date


@dataclass
class Customer:
    """
    Customer domain entity representing a WhatsApp user.
    """
    wa_id: str
    customer_name: Optional[str] = None
    age: Optional[int] = None
    age_recorded_at: Optional[date] = None
    
    def __post_init__(self) -> None:
        """Validate customer data after initialization."""
        if not self.wa_id:
            raise ValueError("Customer wa_id cannot be empty")
    
    def update_name(self, new_name: str) -> None:
        """Update customer name with validation."""
        if not new_name or not new_name.strip():
            raise ValueError("Customer name cannot be empty")
        self.customer_name = new_name.strip() 

    def update_age(self, new_age: Optional[int]) -> None:
        """Update customer's age; None clears it. Enforce sensible bounds."""
        if new_age is None:
            self.age = None
            self.age_recorded_at = None
            return
        if not isinstance(new_age, int):
            raise ValueError("Age must be an integer or None")
        if new_age < 0 or new_age > 120:
            raise ValueError("Age must be between 0 and 120")
        self.age = new_age
        # Reset recorded date to today whenever age is explicitly updated
        self.age_recorded_at = date.today()

    def compute_effective_age(self, as_of: Optional[date] = None) -> Optional[int]:
        """
        Compute age as of 'as_of' date by adding elapsed full years since age_recorded_at.
        Returns None if base age or recorded date is missing.
        """
        if self.age is None or self.age_recorded_at is None:
            return self.age
        ref = as_of or date.today()
        # Calculate full years elapsed between recorded date and reference
        years = ref.year - self.age_recorded_at.year - (
            (ref.month, ref.day) < (self.age_recorded_at.month, self.age_recorded_at.day)
        )
        return max(0, self.age + max(0, years))


@dataclass
class MessageSnapshot:
    """Minimal representation of a customer's message timestamp."""

    date: Optional[str] = None
    time: Optional[str] = None


@dataclass
class ReservationSnapshot:
    """Lean representation of a customer's reservation for hover-card usage."""

    id: Optional[int]
    date: str
    time_slot: str
    type: int
    status: str
    cancelled: bool


@dataclass
class CustomerStats:
    """Aggregate customer statistics for hover-card and analytics views."""

    wa_id: str
    customer_name: Optional[str]
    message_count: int
    reservation_count: int
    reservations: List[ReservationSnapshot]
    first_message: Optional[MessageSnapshot] = None
    last_message: Optional[MessageSnapshot] = None

    def to_dict(self) -> dict[str, object]:
        """Convert the dataclass structure into a plain dictionary."""

        return asdict(self)
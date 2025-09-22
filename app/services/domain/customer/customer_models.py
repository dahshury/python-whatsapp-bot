from dataclasses import dataclass
from typing import Optional


@dataclass
class Customer:
    """
    Customer domain entity representing a WhatsApp user.
    """
    wa_id: str
    customer_name: Optional[str] = None
    age: Optional[int] = None
    
    def __post_init__(self):
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
            return
        if not isinstance(new_age, int):
            raise ValueError("Age must be an integer or None")
        if new_age < 0 or new_age > 120:
            raise ValueError("Age must be between 0 and 120")
        self.age = new_age
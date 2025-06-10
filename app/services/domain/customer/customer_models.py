from dataclasses import dataclass
from typing import Optional


@dataclass
class Customer:
    """
    Customer domain entity representing a WhatsApp user.
    """
    wa_id: str
    customer_name: Optional[str] = None
    
    def __post_init__(self):
        """Validate customer data after initialization."""
        if not self.wa_id:
            raise ValueError("Customer wa_id cannot be empty")
    
    def update_name(self, new_name: str) -> None:
        """Update customer name with validation."""
        if not new_name or not new_name.strip():
            raise ValueError("Customer name cannot be empty")
        self.customer_name = new_name.strip() 
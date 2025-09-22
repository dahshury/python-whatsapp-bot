from typing import Dict, Any, Optional
from ..shared.base_service import BaseService
from .customer_repository import CustomerRepository
from .customer_models import Customer
from app.utils import format_response, fix_unicode_sequence
from app.i18n import get_message


class CustomerService(BaseService):
    """
    Domain service for customer-related business operations.
    Encapsulates customer business logic and coordinates with repository.
    """
    
    def __init__(self, repository: Optional[CustomerRepository] = None, **kwargs):
        """
        Initialize customer service with dependency injection.
        
        Args:
            repository: Customer repository instance for dependency injection
        """
        super().__init__(**kwargs)
        self.repository = repository or CustomerRepository()
    
    def get_service_name(self) -> str:
        return "CustomerService"
    
    def modify_customer_wa_id(self, old_wa_id: str, new_wa_id: str, ar: bool = False) -> Dict[str, Any]:
        """
        Modify customer's WhatsApp ID across all related data.
        
        Args:
            old_wa_id: Current WhatsApp ID
            new_wa_id: New WhatsApp ID  
            ar: Whether to return Arabic messages
            
        Returns:
            Success/failure response with appropriate message
        """
        try:
            # Validate new WhatsApp ID
            validation_error = self._validate_wa_id(new_wa_id, ar)
            if validation_error:
                return validation_error
            
            # Check if IDs are the same
            if old_wa_id == new_wa_id:
                return format_response(True, message=get_message("wa_id_same", ar))
            
            # Perform the update operation
            rows_affected = self.repository.update_wa_id(old_wa_id, new_wa_id)
            
            if rows_affected == 0:
                return format_response(False, message=get_message("wa_id_not_found", ar))
            
            return format_response(True, message=get_message("wa_id_modified", ar))
            
        except Exception as e:
            return self._handle_error("modify_customer_wa_id", e, ar)
    
    def update_customer_name(self, wa_id: str, new_name: str, ar: bool = False) -> Dict[str, Any]:
        """
        Update customer's name.

        Args:
            wa_id: WhatsApp ID of the customer.
            new_name: New name for the customer.
            ar: Whether to return Arabic messages.

        Returns:
            Success/failure response with old_name and new_name if successful.
        """
        try:
            validation_error = self._validate_wa_id(wa_id, ar)
            if validation_error:
                return validation_error

            if not new_name or not new_name.strip():
                return format_response(False, message=get_message("customer_name_required", ar))
            
            new_name = fix_unicode_sequence(new_name.strip())

            customer = self.repository.find_by_wa_id(wa_id)
            if not customer:
                # Or should we create one? For an update, usually customer should exist.
                return format_response(False, message=get_message("customer_not_found_for_update", ar, wa_id=wa_id))

            old_name = customer.customer_name
            if old_name == new_name:
                return format_response(True, message=get_message("customer_name_no_change", ar), data={"old_name": old_name, "new_name": new_name})

            customer.update_name(new_name)
            save_success = self.repository.save(customer) # Assuming save handles insert or update logic

            if save_success:
                return format_response(True, message=get_message("customer_name_updated", ar), data={"old_name": old_name, "new_name": new_name, "wa_id": wa_id})
            else:
                return format_response(False, message=get_message("customer_name_update_failed", ar))

        except Exception as e:
            return self._handle_error("update_customer_name", e, ar)

    def update_customer_age(self, wa_id: str, age: Optional[int], ar: bool = False) -> Dict[str, Any]:
        """Update customer's age. None clears age. Enforce 0-120 bound in model."""
        try:
            validation_error = self._validate_wa_id(wa_id, ar)
            if validation_error:
                return validation_error

            customer = self.repository.find_by_wa_id(wa_id)
            if not customer:
                # Create new customer with only age if not present
                customer = Customer(wa_id=wa_id)
            customer.update_age(age if age is None else int(age))
            ok = self.repository.save(customer)
            return (
                format_response(True, message=get_message("customer_age_updated", ar), data={"wa_id": wa_id, "age": customer.age})
                if ok
                else format_response(False, message=get_message("customer_age_update_failed", ar))
            )
        except ValueError as ve:
            return format_response(False, message=str(ve))
        except Exception as e:
            return self._handle_error("update_customer_age", e, ar)
    
    def get_or_create_customer(self, wa_id: str, customer_name: Optional[str] = None) -> Customer:
        """
        Get existing customer or create new one.
        
        Args:
            wa_id: WhatsApp ID
            customer_name: Optional customer name
            
        Returns:
            Customer instance
        """
        # Try to find existing customer
        customer = self.repository.find_by_wa_id(wa_id)
        
        if customer is None:
            # Create new customer
            customer = Customer(wa_id=wa_id, customer_name=customer_name)
            self.repository.save(customer)
        elif customer_name and customer_name != customer.customer_name:
            # Update existing customer name if provided and different
            customer.update_name(fix_unicode_sequence(customer_name))
            self.repository.save(customer)
        
        return customer 
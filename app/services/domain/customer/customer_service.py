import asyncio
from typing import Dict, Any, Optional, List
from ..shared.base_service import BaseService
from .postgres_customer_repository import get_customer_repository
from .customer_models import Customer
from app.utils import format_response, fix_unicode_sequence
from app.i18n import get_message


class CustomerService(BaseService):
    """
    Domain service for customer-related business operations.
    Encapsulates customer business logic and coordinates with repository.
    """
    
    def __init__(self, repository: Optional[get_customer_repository] = None, **kwargs):
        """
        Initialize customer service with dependency injection.
        
        Args:
            repository: Customer repository instance for dependency injection
        """
        super().__init__(**kwargs)
        self.repository = repository or get_customer_repository()
    
    def get_service_name(self) -> str:
        return "CustomerService"
    
    async def modify_customer_wa_id(self, old_wa_id: str, new_wa_id: str, ar: bool = False) -> Dict[str, Any]:
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
            rows_affected = await self.repository.update_wa_id(old_wa_id, new_wa_id)
            
            if rows_affected == 0:
                return format_response(False, message=get_message("wa_id_not_found", ar))
            
            return format_response(True, message=get_message("wa_id_modified", ar))
            
        except Exception as e:
            return self._handle_error("modify_customer_wa_id", e, ar)
    
    async def update_customer_name(self, wa_id: str, new_name: str, ar: bool = False) -> Dict[str, Any]:
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

            customer = await self.repository.find_by_wa_id(wa_id)
            if not customer:
                # Or should we create one? For an update, usually customer should exist.
                return format_response(False, message=get_message("customer_not_found_for_update", ar, wa_id=wa_id))

            old_name = customer.customer_name
            if old_name == new_name:
                return format_response(True, message=get_message("customer_name_no_change", ar), data={"old_name": old_name, "new_name": new_name})

            customer.update_name(new_name)
            save_success = await self.repository.save(customer) # Assuming save handles insert or update logic

            if save_success:
                return format_response(True, message=get_message("customer_name_updated", ar), data={"old_name": old_name, "new_name": new_name, "wa_id": wa_id})
            else:
                return format_response(False, message=get_message("customer_name_update_failed", ar))

        except Exception as e:
            return self._handle_error("update_customer_name", e, ar)
    
    async def get_or_create_customer(self, wa_id: str, customer_name: Optional[str] = None) -> Customer:
        """
        Get existing customer or create new one.
        
        Args:
            wa_id: WhatsApp ID
            customer_name: Optional customer name
            
        Returns:
            Customer instance
        """
        # Try to find existing customer
        customer = await self.repository.find_by_wa_id(wa_id)
        
        if customer is None:
            # Create new customer
            customer = Customer(wa_id=wa_id, customer_name=customer_name)
            await self.repository.save(customer)
        elif customer_name and customer_name != customer.customer_name:
            # Update existing customer name if provided and different
            customer.update_name(fix_unicode_sequence(customer_name))
            await self.repository.save(customer)
        
        return customer 

    async def ensure_customer_exists(self, wa_id: str, customer_name: str = None) -> Customer:
        """
        Ensure a customer exists in the database, create if not found
        
        Args:
            wa_id: WhatsApp ID
            customer_name: Customer's name (optional)
            
        Returns:
            Customer object
        """
        # Try to get existing customer
        customer = await self.repository.get_customer(wa_id)
        
        if not customer:
            # Create new customer if not found
            success = await self.repository.add_customer(wa_id, customer_name or "Unknown")
            if success:
                customer = await self.repository.get_customer(wa_id)
        
        return customer
    
    async def get_customer(self, wa_id: str) -> Optional[Customer]:
        """
        Get a customer by WhatsApp ID
        
        Args:
            wa_id: WhatsApp ID
            
        Returns:
            Customer object if found, None otherwise
        """
        return await self.repository.get_customer(wa_id)
    
    async def get_all_customers(self, limit: int = 100, offset: int = 0) -> List[Customer]:
        """
        Get all customers with pagination
        
        Args:
            limit: Maximum number of customers to return
            offset: Number of customers to skip
            
        Returns:
            List of Customer objects
        """
        return await self.repository.get_all_customers(limit, offset)
    
    async def search_customers_by_name(self, name_pattern: str, limit: int = 50) -> List[Customer]:
        """
        Search customers by name pattern
        
        Args:
            name_pattern: Pattern to search for in customer names
            limit: Maximum number of results to return
            
        Returns:
            List of matching Customer objects
        """
        return await self.repository.search_customers_by_name(name_pattern, limit)
    
    async def get_customer_stats(self, wa_id: str) -> Dict[str, Any]:
        """
        Get statistics for a specific customer
        
        Args:
            wa_id: WhatsApp ID
            
        Returns:
            Dict containing customer statistics
        """
        return await self.repository.get_customer_stats(wa_id)
    
    async def get_customers_with_stats(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get customers with their basic statistics
        
        Args:
            limit: Maximum number of customers to return
            
        Returns:
            List of customer dictionaries with stats
        """
        return await self.repository.get_customers_with_stats(limit)
    
    async def customer_exists(self, wa_id: str) -> bool:
        """
        Check if a customer exists
        
        Args:
            wa_id: WhatsApp ID to check
            
        Returns:
            True if customer exists, False otherwise
        """
        return await self.repository.customer_exists(wa_id)
    
    async def delete_customer(self, wa_id: str) -> bool:
        """
        Delete a customer and all associated data
        
        Args:
            wa_id: WhatsApp ID of the customer to delete
            
        Returns:
            True if successful, False otherwise
        """
        return await self.repository.delete_customer(wa_id) 
"""
PostgreSQL Customer Repository

This repository handles customer data operations using PostgreSQL.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from .customer_models import Customer
from app.database import get_connection


class CustomerRepository:
    """Customer repository with PostgreSQL support"""
    
    def __init__(self):
        """Initialize the PostgreSQL customer repository."""
        self.logger = logging.getLogger(__name__)
    
    async def add_customer(self, wa_id: str, customer_name: str) -> bool:
        """
        Add a new customer to the database
        
        Args:
            wa_id: WhatsApp ID (unique identifier)
            customer_name: Customer's name
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            connection = await get_connection()
            
            await connection.execute("""
                INSERT INTO customers (wa_id, customer_name, created_at)
                VALUES ($1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (wa_id) DO UPDATE SET
                    customer_name = COALESCE(EXCLUDED.customer_name, customers.customer_name)
            """, [wa_id, customer_name])
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error adding customer: {e}")
            return False
    
    async def get_customer(self, wa_id: str) -> Optional[Customer]:
        """
        Get a customer by WhatsApp ID
        
        Args:
            wa_id: WhatsApp ID to search for
            
        Returns:
            Customer object if found, None otherwise
        """
        try:
            connection = await get_connection()
            
            result = await connection.fetchone("""
                SELECT wa_id, customer_name, created_at
                FROM customers 
                WHERE wa_id = $1
            """, [wa_id])
            
            if result:
                return Customer(
                    wa_id=result['wa_id'],
                    customer_name=result['customer_name'],
                    created_at=result['created_at']
                )
            
            return None
            
        except Exception as e:
            self.logger.error(f"Error getting customer: {e}")
            return None
    
    async def get_all_customers(self, limit: int = 100, offset: int = 0) -> List[Customer]:
        """
        Get all customers with pagination
        
        Args:
            limit: Maximum number of customers to return
            offset: Number of customers to skip
            
        Returns:
            List of Customer objects
        """
        try:
            connection = await get_connection()
            
            results = await connection.fetchall("""
                SELECT wa_id, customer_name, created_at
                FROM customers 
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            """, [limit, offset])
            
            customers = []
            for result in results:
                customers.append(Customer(
                    wa_id=result['wa_id'],
                    customer_name=result['customer_name'],
                    created_at=result['created_at']
                ))
            
            return customers
            
        except Exception as e:
            self.logger.error(f"Error getting all customers: {e}")
            return []
    
    async def update_customer_name(self, wa_id: str, new_name: str) -> bool:
        """
        Update a customer's name
        
        Args:
            wa_id: WhatsApp ID of the customer
            new_name: New name for the customer
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            connection = await get_connection()
            
            result = await connection.execute("""
                UPDATE customers 
                SET customer_name = $1 
                WHERE wa_id = $2
            """, [new_name, wa_id])
            
            return result.get('changes', 0) > 0
            
        except Exception as e:
            self.logger.error(f"Error updating customer name: {e}")
            return False
    
    async def delete_customer(self, wa_id: str) -> bool:
        """
        Delete a customer and all associated data
        
        Args:
            wa_id: WhatsApp ID of the customer to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            connection = await get_connection()
            
            # Delete in correct order due to foreign key constraints
            # First delete conversations
            await connection.execute("""
                DELETE FROM conversation WHERE wa_id = $1
            """, [wa_id])
            
            # Then delete reservations
            await connection.execute("""
                DELETE FROM reservations WHERE wa_id = $1
            """, [wa_id])
            
            # Finally delete customer
            result = await connection.execute("""
                DELETE FROM customers WHERE wa_id = $1
            """, [wa_id])
            
            return result.get('changes', 0) > 0
            
        except Exception as e:
            self.logger.error(f"Error deleting customer: {e}")
            return False
    
    async def search_customers_by_name(self, name_pattern: str, limit: int = 50) -> List[Customer]:
        """
        Search customers by name pattern
        
        Args:
            name_pattern: Pattern to search for in customer names
            limit: Maximum number of results to return
            
        Returns:
            List of matching Customer objects
        """
        try:
            connection = await get_connection()
            
            results = await connection.fetchall("""
                SELECT wa_id, customer_name, created_at
                FROM customers 
                WHERE customer_name ILIKE $1
                ORDER BY customer_name
                LIMIT $2
            """, [f"%{name_pattern}%", limit])
            
            customers = []
            for result in results:
                customers.append(Customer(
                    wa_id=result['wa_id'],
                    customer_name=result['customer_name'],
                    created_at=result['created_at']
                ))
            
            return customers
            
        except Exception as e:
            self.logger.error(f"Error searching customers by name: {e}")
            return []
    
    async def get_customer_stats(self, wa_id: str) -> Dict[str, Any]:
        """
        Get statistics for a specific customer
        
        Args:
            wa_id: WhatsApp ID of the customer
            
        Returns:
            Dict containing customer statistics
        """
        try:
            connection = await get_connection()
            
            # Get conversation count
            conv_count = await connection.fetchone("""
                SELECT COUNT(*) as count FROM conversation WHERE wa_id = $1
            """, [wa_id])
            
            # Get reservation count
            res_count = await connection.fetchone("""
                SELECT COUNT(*) as count FROM reservations WHERE wa_id = $1
            """, [wa_id])
            
            # Get active reservation count
            active_res_count = await connection.fetchone("""
                SELECT COUNT(*) as count FROM reservations 
                WHERE wa_id = $1 AND status = 'active'
            """, [wa_id])
            
            # Get last conversation date
            last_conv = await connection.fetchone("""
                SELECT MAX(date) as last_date FROM conversation WHERE wa_id = $1
            """, [wa_id])
            
            return {
                "wa_id": wa_id,
                "total_conversations": conv_count['count'] if conv_count else 0,
                "total_reservations": res_count['count'] if res_count else 0,
                "active_reservations": active_res_count['count'] if active_res_count else 0,
                "last_conversation_date": last_conv['last_date'] if last_conv else None
            }
            
        except Exception as e:
            self.logger.error(f"Error getting customer stats: {e}")
            return {"error": str(e)}
    
    async def get_customers_with_stats(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get customers with their basic statistics
        
        Args:
            limit: Maximum number of customers to return
            
        Returns:
            List of customer dictionaries with stats
        """
        try:
            connection = await get_connection()
            
            results = await connection.fetchall("""
                SELECT 
                    c.wa_id,
                    c.customer_name,
                    c.created_at,
                    COUNT(DISTINCT conv.id) as conversation_count,
                    COUNT(DISTINCT res.id) as reservation_count,
                    COUNT(DISTINCT CASE WHEN res.status = 'active' THEN res.id END) as active_reservation_count
                FROM customers c
                LEFT JOIN conversation conv ON c.wa_id = conv.wa_id
                LEFT JOIN reservations res ON c.wa_id = res.wa_id
                GROUP BY c.wa_id, c.customer_name, c.created_at
                ORDER BY conversation_count DESC, c.created_at DESC
                LIMIT $1
            """, [limit])
            
            customers_with_stats = []
            for result in results:
                customers_with_stats.append({
                    "wa_id": result['wa_id'],
                    "customer_name": result['customer_name'],
                    "created_at": result['created_at'],
                    "conversation_count": result['conversation_count'],
                    "reservation_count": result['reservation_count'],
                    "active_reservation_count": result['active_reservation_count']
                })
            
            return customers_with_stats
            
        except Exception as e:
            self.logger.error(f"Error getting customers with stats: {e}")
            return []
    
    async def customer_exists(self, wa_id: str) -> bool:
        """
        Check if a customer exists
        
        Args:
            wa_id: WhatsApp ID to check
            
        Returns:
            bool: True if customer exists, False otherwise
        """
        try:
            connection = await get_connection()
            
            result = await connection.fetchone("""
                SELECT 1 FROM customers WHERE wa_id = $1
            """, [wa_id])
            
            return result is not None
            
        except Exception as e:
            self.logger.error(f"Error checking if customer exists: {e}")
            return False


# Global repository instance
_customer_repository = None

async def get_customer_repository() -> CustomerRepository:
    """Get the global customer repository instance"""
    global _customer_repository
    if _customer_repository is None:
        _customer_repository = CustomerRepository()
    return _customer_repository 
import sqlite3
from typing import Optional, List
from app.db import get_connection
from .customer_models import Customer


class CustomerRepository:
    """
    Repository for customer data access operations.
    Implements repository pattern to abstract data access.
    """
    
    def find_by_wa_id(self, wa_id: str) -> Optional[Customer]:
        """
        Find customer by WhatsApp ID.
        
        Args:
            wa_id: WhatsApp ID to search for
            
        Returns:
            Customer instance if found, None otherwise
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT wa_id, customer_name FROM customers WHERE wa_id = ?", (wa_id,))
            row = cursor.fetchone()
            
            if row:
                return Customer(wa_id=row["wa_id"], customer_name=row["customer_name"])
            return None
            
        finally:
            conn.close()
    
    def save(self, customer: Customer) -> bool:
        """
        Save or update customer in database.
        
        Args:
            customer: Customer instance to save
            
        Returns:
            True if save was successful, False otherwise
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT OR REPLACE INTO customers (wa_id, customer_name) 
                   VALUES (?, ?)""",
                (customer.wa_id, customer.customer_name)
            )
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            return False
        finally:
            conn.close()
    
    def update_wa_id(self, old_wa_id: str, new_wa_id: str) -> int:
        """
        Update customer's WhatsApp ID across all related tables.
        
        Args:
            old_wa_id: Current WhatsApp ID
            new_wa_id: New WhatsApp ID
            
        Returns:
            Total number of rows affected across all tables
        """
        conn = get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("BEGIN IMMEDIATE")
            
            # Update customers table
            cursor.execute("UPDATE customers SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
            cust_rows = cursor.rowcount
            
            # Update conversation table
            cursor.execute("UPDATE conversation SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
            conv_rows = cursor.rowcount
            
            # Update reservations table
            cursor.execute("UPDATE reservations SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
            res_rows = cursor.rowcount
            
            total_rows = cust_rows + conv_rows + res_rows
            
            if total_rows > 0:
                conn.commit()
            else:
                conn.rollback()
                
            return total_rows
            
        except sqlite3.Error:
            conn.rollback()
            raise
        finally:
            conn.close() 
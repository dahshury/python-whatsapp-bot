from typing import Optional
from app.db import get_session, CustomerModel, ConversationModel, ReservationModel
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
        with get_session() as session:
            db_customer = session.get(CustomerModel, wa_id)
            if db_customer:
                return Customer(wa_id=db_customer.wa_id, customer_name=db_customer.customer_name)
            return None
    
    def save(self, customer: Customer) -> bool:
        """
        Save or update customer in database.
        
        Args:
            customer: Customer instance to save
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            with get_session() as session:
                existing = session.get(CustomerModel, customer.wa_id)
                if existing is None:
                    session.add(CustomerModel(wa_id=customer.wa_id, customer_name=customer.customer_name))
                else:
                    existing.customer_name = customer.customer_name
                session.commit()
                return True
        except Exception:
            return False
    
    def update_wa_id(self, old_wa_id: str, new_wa_id: str) -> int:
        """
        Update customer's WhatsApp ID across all related tables.
        
        Args:
            old_wa_id: Current WhatsApp ID
            new_wa_id: New WhatsApp ID
            
        Returns:
            Total number of rows affected across all tables
        """
        with get_session() as session:
            # Update customers
            cust_rows = session.query(CustomerModel).filter(CustomerModel.wa_id == old_wa_id).update({CustomerModel.wa_id: new_wa_id}, synchronize_session=False)
            # Update conversation
            conv_rows = session.query(ConversationModel).filter(ConversationModel.wa_id == old_wa_id).update({ConversationModel.wa_id: new_wa_id}, synchronize_session=False)
            # Update reservations
            res_rows = session.query(ReservationModel).filter(ReservationModel.wa_id == old_wa_id).update({ReservationModel.wa_id: new_wa_id}, synchronize_session=False)

            total_rows = (cust_rows or 0) + (conv_rows or 0) + (res_rows or 0)
            if total_rows > 0:
                session.commit()
            else:
                session.rollback()
            return total_rows
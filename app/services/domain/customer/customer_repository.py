from typing import Optional

from sqlalchemy import func

from app.db import get_session, CustomerModel, ConversationModel, ReservationModel
from .customer_models import (
    Customer,
    CustomerStats,
    MessageSnapshot,
    ReservationSnapshot,
)


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
                return Customer(
                    wa_id=db_customer.wa_id,
                    customer_name=db_customer.customer_name,
                    age=getattr(db_customer, "age", None),
                    age_recorded_at=getattr(db_customer, "age_recorded_at", None),
                )
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
                    session.add(
                        CustomerModel(
                            wa_id=customer.wa_id,
                            customer_name=customer.customer_name,
                            age=customer.age,
                            age_recorded_at=customer.age_recorded_at,
                        )
                    )
                else:
                    existing.customer_name = customer.customer_name
                    # Age column may not exist in older DBs; guard with getattr
                    try:
                        setattr(existing, "age", customer.age)
                    except Exception:
                        pass
                    # Record/update age_recorded_at if column exists
                    try:
                        setattr(existing, "age_recorded_at", customer.age_recorded_at)
                    except Exception:
                        pass
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

    def get_customer_stats(self, wa_id: str) -> Optional[CustomerStats]:
        """Aggregate messaging and reservation statistics for a customer."""

        with get_session() as session:
            customer = session.get(CustomerModel, wa_id)
            if customer is None:
                return None

            message_count = (
                session.query(func.count(ConversationModel.id))
                .filter(ConversationModel.wa_id == wa_id)
                .scalar()
            ) or 0

            first_message_row = (
                session.query(ConversationModel.date, ConversationModel.time)
                .filter(ConversationModel.wa_id == wa_id)
                .order_by(ConversationModel.date.asc(), ConversationModel.time.asc())
                .first()
            )

            last_message_row = (
                session.query(ConversationModel.date, ConversationModel.time)
                .filter(ConversationModel.wa_id == wa_id)
                .order_by(ConversationModel.date.desc(), ConversationModel.time.desc())
                .first()
            )

            reservation_rows = (
                session.query(ReservationModel)
                .filter(ReservationModel.wa_id == wa_id)
                .order_by(ReservationModel.date.asc(), ReservationModel.time_slot.asc())
                .all()
            )

            reservations = [
                ReservationSnapshot(
                    id=row.id if row.id is not None else None,
                    date=row.date,
                    time_slot=row.time_slot,
                    type=row.type,
                    status=row.status,
                    cancelled=row.status == "cancelled",
                )
                for row in reservation_rows
            ]

            return CustomerStats(
                wa_id=wa_id,
                customer_name=getattr(customer, "customer_name", None),
                message_count=int(message_count),
                reservation_count=len(reservations),
                reservations=reservations,
                first_message=MessageSnapshot(
                    date=first_message_row.date if first_message_row else None,
                    time=first_message_row.time if first_message_row else None,
                )
                if first_message_row
                else None,
                last_message=MessageSnapshot(
                    date=last_message_row.date if last_message_row else None,
                    time=last_message_row.time if last_message_row else None,
                )
                if last_message_row
                else None,
            )
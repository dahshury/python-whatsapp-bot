import logging

from sqlalchemy import func

from app.db import ConversationModel, CustomerModel, ReservationModel, get_session

from .customer_models import (
    Customer,
    CustomerStats,
    MessageSnapshot,
    ReservationSnapshot,
)

logger = logging.getLogger(__name__)


class CustomerRepository:
    """
    Repository for customer data access operations.
    Implements repository pattern to abstract data access.
    """

    def find_by_wa_id(self, wa_id: str) -> Customer | None:
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
                        existing.age = customer.age
                    except Exception:
                        pass
                    # Record/update age_recorded_at if column exists
                    try:
                        existing.age_recorded_at = customer.age_recorded_at
                    except Exception:
                        pass
                session.commit()
                return True
        except Exception:
            return False

    def update_wa_id(
        self,
        old_wa_id: str,
        new_wa_id: str,
        customer_name: str | None = None,
    ) -> tuple[int, str | None, list[dict[str, object]]]:
        """
        Update customer's WhatsApp ID across all related tables.

        Args:
            old_wa_id: Current WhatsApp ID
            new_wa_id: New WhatsApp ID

        Returns:
            Tuple of (rows affected, resulting customer_name)
        """
        resulting_name: str | None = None
        previous_reservations: list[dict[str, object]] = []
        logger.info(
            "CustomerRepository.update_wa_id start old=%s new=%s customer_name=%s",
            old_wa_id,
            new_wa_id,
            customer_name,
        )
        with get_session() as session:
            existing_customer: CustomerModel | None = session.get(CustomerModel, old_wa_id)
            if existing_customer is None:
                logger.warning(
                    "CustomerRepository.update_wa_id old customer missing old=%s",
                    old_wa_id,
                )
                return 0, None, []

            existing_res_rows = (
                session.query(
                    ReservationModel.id,
                    ReservationModel.date,
                    ReservationModel.time_slot,
                    ReservationModel.type,
                    ReservationModel.status,
                )
                .filter(ReservationModel.wa_id == old_wa_id)
                .all()
            )
            previous_reservations = []

            target_customer: CustomerModel | None = session.get(CustomerModel, new_wa_id)
            if target_customer is None:
                logger.info(
                    "CustomerRepository.update_wa_id creating new customer record new=%s from old=%s",
                    new_wa_id,
                    old_wa_id,
                )
                target_customer = CustomerModel(
                    wa_id=new_wa_id,
                    customer_name=existing_customer.customer_name,
                )
                if customer_name is not None and customer_name.strip():
                    target_customer.customer_name = customer_name.strip()
                # Copy optional fields if they exist on the model
                if hasattr(existing_customer, "age"):
                    target_customer.age = existing_customer.age
                if hasattr(existing_customer, "age_recorded_at"):
                    target_customer.age_recorded_at = existing_customer.age_recorded_at
                session.add(target_customer)
            else:
                logger.info(
                    "CustomerRepository.update_wa_id reusing existing customer new=%s",
                    new_wa_id,
                )
                target_customer.customer_name = existing_customer.customer_name
                if customer_name is not None and customer_name.strip():
                    target_customer.customer_name = customer_name.strip()
                if hasattr(existing_customer, "age"):
                    target_customer.age = existing_customer.age
                if hasattr(existing_customer, "age_recorded_at"):
                    target_customer.age_recorded_at = existing_customer.age_recorded_at

            # Commit the new customer record first to satisfy FK constraints
            session.commit()
            resulting_name = target_customer.customer_name
            logger.info(
                "CustomerRepository.update_wa_id committed new/updated customer new=%s resulting_name=%s",
                new_wa_id,
                resulting_name,
            )

            if not previous_reservations:
                for row in existing_res_rows:
                    logger.debug(
                        "CustomerRepository.update_wa_id capturing reservation snapshot id=%s date=%s time_slot=%s",
                        row.id,
                        row.date,
                        row.time_slot,
                    )
                    previous_reservations.append(
                        {
                            "id": row.id,
                            "date": row.date,
                            "time_slot": row.time_slot,
                            "type": row.type,
                            "status": row.status,
                            "customer_name": target_customer.customer_name,
                        }
                    )

        # Use a new session for the updates to avoid detached instance issues
        with get_session() as session:
            # Update dependent tables
            res_rows = (
                session.query(ReservationModel)
                .filter(ReservationModel.wa_id == old_wa_id)
                .update({ReservationModel.wa_id: new_wa_id}, synchronize_session=False)
            )
            conv_rows = (
                session.query(ConversationModel)
                .filter(ConversationModel.wa_id == old_wa_id)
                .update({ConversationModel.wa_id: new_wa_id}, synchronize_session=False)
            )
            logger.info(
                "CustomerRepository.update_wa_id updated dependents reservations=%s conversations=%s",
                res_rows,
                conv_rows,
            )

            # Delete old customer record (now safe since FK references are updated)
            old_customer = session.get(CustomerModel, old_wa_id)
            if old_customer:
                session.delete(old_customer)
                logger.info(
                    "CustomerRepository.update_wa_id deleted old customer old=%s",
                    old_wa_id,
                )

            session.commit()

            total_rows = (res_rows or 0) + (conv_rows or 0) + 1
            if resulting_name is None:
                new_customer = session.get(CustomerModel, new_wa_id)
                resulting_name = getattr(new_customer, "customer_name", None) if new_customer else None
            logger.info(
                "CustomerRepository.update_wa_id completed total_rows=%s resulting_name=%s previous_reservations=%s",
                total_rows,
                resulting_name,
                previous_reservations,
            )
            return total_rows, resulting_name, previous_reservations

    def get_customer_stats(self, wa_id: str) -> CustomerStats | None:
        """Aggregate messaging and reservation statistics for a customer."""

        with get_session() as session:
            customer = session.get(CustomerModel, wa_id)
            if customer is None:
                return None

            message_count = (
                session.query(func.count(ConversationModel.id)).filter(ConversationModel.wa_id == wa_id).scalar()
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

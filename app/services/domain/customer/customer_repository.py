from collections.abc import Sequence

from sqlalchemy import text

from app.db import ConversationModel, CustomerModel, ReservationModel, get_session

from .customer_models import Customer


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

    def search_customers(self, query: str, limit: int = 25) -> list[Customer]:
        """
        Fuzzy search customers by name or wa_id using PostgreSQL pg_trgm where available.
        Falls back to ILIKE if pg_trgm is not available.
        """
        q = str(query or "").strip()
        if not q:
            return []
        with get_session() as session:
            try:
                # Combine Arabic-normalized fuzzy (pg_trgm) with partial substring (ILIKE) and exact numeric contains for wa_id
                sql = text(
                    """
                    SELECT wa_id, customer_name
                    FROM customers, set_limit(0.15)
                    WHERE (
                        normalize_arabic(customer_name) % normalize_arabic(:q)
                        OR normalize_arabic(customer_name) ILIKE ('%' || normalize_arabic(:q) || '%')
                        OR lower(wa_id) ILIKE ('%' || lower(:q) || '%')
                    )
                    ORDER BY GREATEST(
                        -- prioritize fuzzy name similarity, then substring hits
                        similarity(normalize_arabic(customer_name), normalize_arabic(:q)),
                        CASE WHEN normalize_arabic(customer_name) ILIKE ('%' || normalize_arabic(:q) || '%') THEN 0.999 ELSE 0 END,
                        CASE WHEN lower(wa_id) ILIKE ('%' || lower(:q) || '%') THEN 0.998 ELSE 0 END
                    ) DESC
                    LIMIT :lim
                    """
                )
                rows: Sequence[tuple[str, str | None]] = session.execute(
                    sql, {"q": q, "lim": int(limit)}
                ).all()  # type: ignore
            except Exception:
                # Fallback: case-insensitive substring search
                like = f"%{q.lower()}%"
                rows = (
                    session.query(CustomerModel.wa_id, CustomerModel.customer_name)
                    .filter(
                        (CustomerModel.customer_name.isnot(None))
                        & (CustomerModel.customer_name.ilike(like))
                        | (CustomerModel.wa_id.ilike(like))
                    )
                    .order_by(CustomerModel.customer_name.asc())
                    .limit(int(limit))
                    .all()
                )

            out: list[Customer] = []
            for wa, name in rows:
                out.append(
                    Customer(
                        wa_id=str(wa),
                        customer_name=str(name) if name is not None else None,
                    )
                )
            return out

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
            cust_rows = (
                session.query(CustomerModel)
                .filter(CustomerModel.wa_id == old_wa_id)
                .update({CustomerModel.wa_id: new_wa_id}, synchronize_session=False)
            )
            # Update conversation
            conv_rows = (
                session.query(ConversationModel)
                .filter(ConversationModel.wa_id == old_wa_id)
                .update({ConversationModel.wa_id: new_wa_id}, synchronize_session=False)
            )
            # Update reservations
            res_rows = (
                session.query(ReservationModel)
                .filter(ReservationModel.wa_id == old_wa_id)
                .update({ReservationModel.wa_id: new_wa_id}, synchronize_session=False)
            )

            total_rows = (cust_rows or 0) + (conv_rows or 0) + (res_rows or 0)
            if total_rows > 0:
                session.commit()
            else:
                session.rollback()
            return total_rows

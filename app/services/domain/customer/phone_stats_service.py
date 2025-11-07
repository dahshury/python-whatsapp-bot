import phonenumbers
from sqlalchemy import text

from app.db import CustomerModel, get_session
from app.services.domain.shared.base_service import BaseService


class PhoneStatsService(BaseService):
    """
    Service for getting phone/customer statistics efficiently.
    Returns country counts and registration status counts from all customers.
    """

    def get_service_name(self) -> str:
        """Return the service name for logging/identification."""
        return "PhoneStatsService"

    def get_country_stats(self) -> dict[str, int]:
        """
        Get count of customers per country code.
        Returns dict mapping country codes (e.g., 'SA', 'US') to counts.
        """
        with get_session() as session:
            # Get all customers with their wa_id
            customers = session.query(CustomerModel.wa_id).all()

            country_counts: dict[str, int] = {}

            for (wa_id,) in customers:
                try:
                    # Parse phone number to extract country
                    phone_number = wa_id if wa_id.startswith('+') else f'+{wa_id}'
                    parsed = phonenumbers.parse(phone_number, None)
                    if parsed and parsed.country_code:
                        # Get country code from phone number
                        country_code = phonenumbers.region_code_for_number(parsed)
                        if country_code:
                            country_counts[country_code] = country_counts.get(country_code, 0) + 1
                except Exception:
                    # Skip invalid phone numbers
                    continue

            return country_counts

    def get_registration_stats(self) -> dict[str, int]:
        """
        Get count of registered vs unknown customers.
        Returns dict with 'registered' (has custom name) and 'unknown' (no name) counts.
        """
        with get_session() as session:
            # Use SQL to efficiently count customers with and without names
            result = session.execute(
                text("""
                    SELECT
                        COUNT(*) FILTER (WHERE customer_name IS NOT NULL
                                         AND customer_name != ''
                                         AND customer_name != wa_id
                                         AND customer_name != REPLACE(REPLACE(REPLACE(wa_id, ' ', ''), '-', ''), '+', '')) as registered_count,
                        COUNT(*) FILTER (WHERE customer_name IS NULL
                                         OR customer_name = ''
                                         OR customer_name = wa_id
                                         OR customer_name = REPLACE(REPLACE(REPLACE(wa_id, ' ', ''), '-', ''), '+', '')) as unknown_count
                    FROM customers
                """)
            )

            row = result.fetchone()
            return {
                'registered': int(row.registered_count) if row else 0,
                'unknown': int(row.unknown_count) if row else 0,
            }

    def get_all_stats(self) -> dict:
        """
        Get all phone statistics in one call.
        Returns country counts and registration status counts.
        """
        return {
            'countries': self.get_country_stats(),
            'registration': self.get_registration_stats(),
        }


from datetime import datetime

from sqlalchemy import text

from app.db import get_session
from app.services.domain.shared.base_service import BaseService


class PhoneSearchResult:
    """Data transfer object for phone search results."""

    def __init__(
        self,
        wa_id: str,
        customer_name: str | None = None,
        last_message_at: datetime | None = None,
        last_reservation_at: datetime | None = None,
        similarity: float = 0.0
    ):
        self.wa_id = wa_id
        self.customer_name = customer_name
        self.last_message_at = last_message_at
        self.last_reservation_at = last_reservation_at
        self.similarity = similarity

    def to_dict(self) -> dict[str, any]:
        """Convert to dictionary for API response."""
        return {
            'wa_id': self.wa_id,
            'customer_name': self.customer_name,
            'last_message_at': self.last_message_at.isoformat() if self.last_message_at else None,
            'last_reservation_at': self.last_reservation_at.isoformat() if self.last_reservation_at else None,
            'similarity': self.similarity
        }


class PhoneSearchService(BaseService):
    """
    Service for searching phone numbers and customer names using PostgreSQL pg_trgm.
    Implements trigram similarity search for fuzzy matching on phones and names (Arabic/English).
    """

    def get_service_name(self) -> str:
        """Return the service name for logging/identification."""
        return "PhoneSearchService"

    def search_phones(
        self,
        query: str,
        limit: int = 100,
        min_similarity: float = 0.3
    ) -> list[PhoneSearchResult]:
        """
        Search for phone numbers and customer names using pg_trgm similarity.

        Searches across:
        - Phone numbers (wa_id)
        - Customer names (both Arabic and English)

        Args:
            query: Search query string (can be phone number, name in any language)
            limit: Maximum number of results to return
            min_similarity: Minimum similarity threshold (0.0 to 1.0)

        Returns:
            List of PhoneSearchResult objects sorted by relevance
        """
        if not query or not query.strip():
            return []

        query = query.strip()

        with get_session() as session:
            # Use pg_trgm similarity operator for fuzzy matching
            # The % operator is the similarity operator in pg_trgm
            # We also use similarity() function to get the actual score for sorting

            # Normalize phone query: remove spaces, dashes, plus signs
            normalized_phone_query = query.replace(' ', '').replace('-', '').replace('+', '')

            sql_query = text("""
                WITH customer_similarity AS (
                    SELECT
                        c.wa_id,
                        c.customer_name,
                        GREATEST(
                            similarity(COALESCE(c.wa_id, ''), :phone_query),
                            -- Use word_similarity for names (better for short queries like "jo" matching "Joanah")
                            word_similarity(:name_query, COALESCE(c.customer_name, '')),
                            -- Arabic-normalized name word_similarity for better matching
                            word_similarity(normalize_arabic(:name_query), normalize_arabic(COALESCE(c.customer_name, ''))),
                            -- Also check if phone contains the normalized query as substring
                            CASE
                                WHEN REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')
                                     LIKE '%' || :normalized_phone || '%'
                                THEN 0.9
                                ELSE 0.0
                            END
                        ) as sim_score
                    FROM customers c
                    WHERE
                        -- Match using pg_trgm similarity and word_similarity
                        (c.wa_id % :phone_query
                         OR word_similarity(:name_query, c.customer_name) >= :min_similarity
                         OR word_similarity(normalize_arabic(:name_query), normalize_arabic(c.customer_name)) >= :min_similarity)
                        OR
                        -- Also match phone numbers that contain the query as substring
                        REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')
                            LIKE '%' || :normalized_phone || '%'
                ),
                latest_user_messages AS (
                    SELECT
                        wa_id,
                        MAX(date || ' ' || time) as last_user_message_at
                    FROM conversation
                    WHERE role = 'user'
                      AND date IS NOT NULL
                      AND time IS NOT NULL
                    GROUP BY wa_id
                ),
                latest_reservations AS (
                    SELECT
                        wa_id,
                        MAX(updated_at) as last_reservation_at
                    FROM reservations
                    GROUP BY wa_id
                )
                SELECT
                    cs.wa_id,
                    cs.customer_name,
                    cs.sim_score,
                    lm.last_user_message_at AS last_message_at,
                    lr.last_reservation_at
                FROM customer_similarity cs
                LEFT JOIN latest_user_messages lm ON cs.wa_id = lm.wa_id
                LEFT JOIN latest_reservations lr ON cs.wa_id = lr.wa_id
                WHERE cs.sim_score >= :min_similarity
                ORDER BY cs.sim_score DESC, lm.last_user_message_at DESC NULLS LAST
                LIMIT :limit
            """)

            result = session.execute(
                sql_query,
                {
                    'phone_query': query,
                    'name_query': query,
                    'normalized_phone': normalized_phone_query,
                    'min_similarity': min_similarity,
                    'limit': limit
                }
            )

            results = []
            for row in result:
                # Parse last_message_at if it's a string
                last_msg_at = row.last_message_at
                if last_msg_at and isinstance(last_msg_at, str):
                    try:
                        last_msg_at = datetime.strptime(last_msg_at, '%Y-%m-%d %H:%M:%S')
                    except:
                        last_msg_at = None

                results.append(
                    PhoneSearchResult(
                        wa_id=row.wa_id,
                        customer_name=row.customer_name,
                        last_message_at=last_msg_at,
                        last_reservation_at=row.last_reservation_at,
                        similarity=float(row.sim_score)
                    )
                )

            return results

    def get_recent_contacts(self, limit: int = 50) -> list[PhoneSearchResult]:
        """
        Get recent contacts sorted by last user message (not any message).
        Only includes contacts that have at least one user message.

        Args:
            limit: Maximum number of contacts to return (default 50)

        Returns:
            List of PhoneSearchResult objects sorted by last user message time (most recent first)
        """
        with get_session() as session:
            sql_query = text("""
                WITH latest_user_messages AS (
                    SELECT
                        wa_id,
                        MAX(date || ' ' || time) as last_message_at
                    FROM conversation
                    WHERE role = 'user'
                      AND date IS NOT NULL
                      AND time IS NOT NULL
                    GROUP BY wa_id
                ),
                latest_reservations AS (
                    SELECT
                        wa_id,
                        MAX(updated_at) as last_reservation_at
                    FROM reservations
                    GROUP BY wa_id
                )
                SELECT
                    c.wa_id,
                    c.customer_name,
                    lum.last_message_at,
                    lr.last_reservation_at
                FROM customers c
                INNER JOIN latest_user_messages lum ON c.wa_id = lum.wa_id
                LEFT JOIN latest_reservations lr ON c.wa_id = lr.wa_id
                ORDER BY lum.last_message_at DESC NULLS LAST
                LIMIT :limit
            """)

            result = session.execute(sql_query, {'limit': limit})

            results = []
            for row in result:
                # Parse last_message_at if it's a string
                last_msg_at = row.last_message_at
                if last_msg_at and isinstance(last_msg_at, str):
                    try:
                        last_msg_at = datetime.strptime(last_msg_at, '%Y-%m-%d %H:%M:%S')
                    except:
                        last_msg_at = None

                results.append(
                    PhoneSearchResult(
                        wa_id=row.wa_id,
                        customer_name=row.customer_name,
                        last_message_at=last_msg_at,
                        last_reservation_at=row.last_reservation_at,
                        similarity=1.0  # All recent contacts have similarity 1.0
                    )
                )

            return results

    def get_all_contacts(
        self,
        page: int = 1,
        page_size: int = 100,
        filters: dict[str, any] | None = None,
        exclude_phone_numbers: list[str] | None = None
    ) -> tuple[list[PhoneSearchResult], int]:
        """
        Get all contacts with pagination.

        Args:
            page: Page number (1-indexed)
            page_size: Number of contacts per page (default 100)
            filters: Optional filters dict with keys:
                - country: Filter by country code
                - registration: 'registered' or 'unknown'
                - date_range: Dict with 'type' ('messages' or 'reservations') and 'range' (DateRange)
            exclude_phone_numbers: Optional list of phone numbers to exclude from results

        Returns:
            Tuple of (list of PhoneSearchResult objects, total count)
        """
        with get_session() as session:
            # Build WHERE clause based on filters
            where_conditions = []
            filter_params = {}

            # Exclude phone numbers filter
            if exclude_phone_numbers and len(exclude_phone_numbers) > 0:
                # Create placeholders for each phone number
                placeholders = ", ".join([f":exclude_{i}" for i in range(len(exclude_phone_numbers))])
                where_conditions.append(f"c.wa_id NOT IN ({placeholders})")
                for i, phone in enumerate(exclude_phone_numbers):
                    filter_params[f'exclude_{i}'] = phone

            if filters:
                # Country filter
                if filters.get('country'):
                    # Extract country code from phone numbers using phonenumbers library
                    # This is complex, so we'll filter in Python for now
                    # For better performance, we could add a country_code column to customers table
                    pass  # Will filter in Python after fetching

                # Registration filter
                if filters.get('registration') == 'registered':
                    where_conditions.append(
                        "c.customer_name IS NOT NULL "
                        "AND c.customer_name != '' "
                        "AND c.customer_name != c.wa_id "
                        "AND c.customer_name != REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')"
                    )
                elif filters.get('registration') == 'unknown':
                    where_conditions.append(
                        "(c.customer_name IS NULL "
                        "OR c.customer_name = '' "
                        "OR c.customer_name = c.wa_id "
                        "OR c.customer_name = REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', ''))"
                    )

                # Date range filter
                date_range = filters.get('date_range')
                if date_range:
                    range_type = date_range.get('type')
                    date_range_obj = date_range.get('range')
                    # Support single date filtering - if only one date provided, treat as single day
                    if date_range_obj:
                        from_date = date_range_obj.get('from')
                        to_date = date_range_obj.get('to')
                        
                        # Ensure both dates are set for single date selection
                        if from_date and not to_date:
                            # Only from_date provided - treat as single day
                            to_date = from_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                            from_date = from_date.replace(hour=0, minute=0, second=0, microsecond=0)
                        elif to_date and not from_date:
                            # Only to_date provided - treat as single day
                            from_date = to_date.replace(hour=0, minute=0, second=0, microsecond=0)
                            to_date = to_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                        
                        if from_date and to_date:
                            if range_type == 'messages':
                                where_conditions.append(
                                    "EXISTS ("
                                    "  SELECT 1 FROM conversation conv "
                                    "  WHERE conv.wa_id = c.wa_id "
                                    "    AND conv.role = 'user' "
                                    "    AND conv.date IS NOT NULL "
                                    "    AND conv.time IS NOT NULL "
                                    "    AND (conv.date || ' ' || conv.time) >= :date_from "
                                    "    AND (conv.date || ' ' || conv.time) <= :date_to"
                                    ")"
                                )
                                filter_params['date_from'] = from_date.strftime('%Y-%m-%d %H:%M:%S')
                                filter_params['date_to'] = to_date.strftime('%Y-%m-%d %H:%M:%S')
                            elif range_type == 'reservations':
                                # Use bind parameter for ':00' to avoid SQLAlchemy parsing it as a parameter placeholder
                                where_conditions.append(
                                    "EXISTS ("
                                    "  SELECT 1 FROM reservations res "
                                    "  WHERE res.wa_id = c.wa_id "
                                    "    AND res.date IS NOT NULL "
                                    "    AND res.time_slot IS NOT NULL "
                                    "    AND (res.date || ' ' || res.time_slot || :seconds_suffix) >= :date_from "
                                    "    AND (res.date || ' ' || res.time_slot || :seconds_suffix) <= :date_to"
                                    ")"
                                )
                                filter_params['date_from'] = from_date.strftime('%Y-%m-%d %H:%M:%S')
                                filter_params['date_to'] = to_date.strftime('%Y-%m-%d %H:%M:%S')
                                filter_params['seconds_suffix'] = ':00'

            where_clause = ""
            if where_conditions:
                where_clause = "WHERE " + " AND ".join(where_conditions)

            # Get total count
            count_query = text(f"""
                SELECT COUNT(*) as total
                FROM customers c
                {where_clause}
            """)
            count_result = session.execute(count_query, filter_params)
            total_count = count_result.scalar() or 0

            # Calculate offset
            offset = (page - 1) * page_size

            # Get paginated results
            sql_query = text(f"""
                WITH latest_user_messages AS (
                    SELECT
                        wa_id,
                        MAX(date || ' ' || time) as last_user_message_at
                    FROM conversation
                    WHERE role = 'user'
                      AND date IS NOT NULL
                      AND time IS NOT NULL
                    GROUP BY wa_id
                ),
                latest_reservations AS (
                    SELECT
                        wa_id,
                        MAX(updated_at) as last_reservation_at
                    FROM reservations
                    GROUP BY wa_id
                )
                SELECT
                    c.wa_id,
                    c.customer_name,
                    lm.last_user_message_at AS last_message_at,
                    lr.last_reservation_at
                FROM customers c
                LEFT JOIN latest_user_messages lm ON c.wa_id = lm.wa_id
                LEFT JOIN latest_reservations lr ON c.wa_id = lr.wa_id
                {where_clause}
                ORDER BY
                    -- Prioritize contacts with real names (not just phone numbers)
                    CASE 
                        WHEN c.customer_name IS NOT NULL 
                             AND c.customer_name != '' 
                             AND c.customer_name != c.wa_id 
                             AND c.customer_name != REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')
                        THEN 0
                        ELSE 1
                    END ASC,
                    -- Sort alphabetically: names first, then phone numbers
                    CASE 
                        WHEN c.customer_name IS NOT NULL 
                             AND c.customer_name != '' 
                             AND c.customer_name != c.wa_id 
                             AND c.customer_name != REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')
                        THEN LOWER(c.customer_name)
                        ELSE c.wa_id
                    END ASC
                LIMIT :page_size OFFSET :offset
            """)

            filter_params['page_size'] = page_size
            filter_params['offset'] = offset

            result = session.execute(sql_query, filter_params)

            results = []
            for row in result:
                # Parse last_message_at if it's a string
                last_msg_at = row.last_message_at
                if last_msg_at and isinstance(last_msg_at, str):
                    try:
                        last_msg_at = datetime.strptime(last_msg_at, '%Y-%m-%d %H:%M:%S')
                    except:
                        last_msg_at = None

                results.append(
                    PhoneSearchResult(
                        wa_id=row.wa_id,
                        customer_name=row.customer_name,
                        last_message_at=last_msg_at,
                        last_reservation_at=row.last_reservation_at,
                        similarity=1.0
                    )
                )

            # Apply country filter in Python if needed (since we don't have country_code column)
            # Note: This should ideally be done in SQL, but requires country_code column
            # For country filter, we need to fetch all results, filter, then paginate
            if filters and filters.get('country'):
                import phonenumbers
                country_code = filters['country']

                # Fetch all results first (without pagination)
                all_results_query = text(f"""
                    WITH latest_user_messages AS (
                        SELECT
                            wa_id,
                            MAX(date || ' ' || time) as last_user_message_at
                        FROM conversation
                        WHERE role = 'user'
                          AND date IS NOT NULL
                          AND time IS NOT NULL
                        GROUP BY wa_id
                    ),
                    latest_reservations AS (
                        SELECT
                            wa_id,
                            MAX(updated_at) as last_reservation_at
                        FROM reservations
                        GROUP BY wa_id
                    )
                    SELECT
                        c.wa_id,
                        c.customer_name,
                        lm.last_user_message_at AS last_message_at,
                        lr.last_reservation_at
                    FROM customers c
                    LEFT JOIN latest_user_messages lm ON c.wa_id = lm.wa_id
                    LEFT JOIN latest_reservations lr ON c.wa_id = lr.wa_id
                    {where_clause}
                    ORDER BY 
                        CASE 
                            WHEN c.customer_name IS NOT NULL 
                                 AND c.customer_name != '' 
                                 AND c.customer_name != c.wa_id 
                                 AND c.customer_name != REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')
                            THEN 0
                            ELSE 1
                        END ASC,
                        CASE 
                            WHEN c.customer_name IS NOT NULL 
                                 AND c.customer_name != '' 
                                 AND c.customer_name != c.wa_id 
                                 AND c.customer_name != REPLACE(REPLACE(REPLACE(c.wa_id, ' ', ''), '-', ''), '+', '')
                            THEN LOWER(c.customer_name)
                            ELSE c.wa_id
                        END ASC
                """)

                all_results = session.execute(all_results_query, filter_params).all()

                # Filter by country
                filtered_results = []
                for row in all_results:
                    try:
                        phone_number = row.wa_id if row.wa_id.startswith('+') else f'+{row.wa_id}'
                        parsed = phonenumbers.parse(phone_number, None)
                        if parsed and phonenumbers.region_code_for_number(parsed) == country_code:
                            # Parse last_message_at if it's a string
                            last_msg_at = row.last_message_at
                            if last_msg_at and isinstance(last_msg_at, str):
                                try:
                                    last_msg_at = datetime.strptime(last_msg_at, '%Y-%m-%d %H:%M:%S')
                                except:
                                    last_msg_at = None

                            filtered_results.append(
                                PhoneSearchResult(
                                    wa_id=row.wa_id,
                                    customer_name=row.customer_name,
                                    last_message_at=last_msg_at,
                                    last_reservation_at=row.last_reservation_at,
                                    similarity=1.0
                                )
                            )
                    except:
                        continue

                # Apply pagination to filtered results
                total_count = len(filtered_results)
                paginated_results = filtered_results[offset:offset + page_size]

                return paginated_results, total_count

            return results, total_count


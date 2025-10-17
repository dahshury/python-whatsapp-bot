import contextlib

from sqlalchemy.engine import Connection


def ensure_text_search_objects(conn: Connection) -> None:
    """
    Ensure pg_trgm extension, Arabic normalization function, and trigram indexes exist.

    This is idempotent and safe to run on PostgreSQL connections. It will be
    ignored by other databases.
    """
    try:
        # Make sure pg_trgm is available (PostgreSQL only)
        with contextlib.suppress(Exception):
            conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

        # Create/replace the Arabic normalization function to unify variants
        # - Maps hamza/aleph variants to bare aleph
        # - Maps yeh variants to ي, waw-hamza to و, teh marbuta to ه, kaf variants to ك
        # - Removes diacritics (harakat, shadda), tatweel, zero-width marks
        # - Lowercases the result
        with contextlib.suppress(Exception):
            conn.exec_driver_sql(
                r"""
                CREATE OR REPLACE FUNCTION normalize_arabic(input text)
                RETURNS text AS $$
                SELECT lower(
                    regexp_replace(
                        regexp_replace(
                            translate(
                                translate(
                                    translate(
                                        translate(
                                            translate(
                                                translate(
                                                    translate(
                                                        translate(
                                                            input,
                                                            'أإآٱ',
                                                            'اااا'
                                                        ),
                                                        'ى', 'ي'
                                                    ),
                                                    'ئ', 'ي'
                                                ),
                                                'ؤ', 'و'
                                            ),
                                            'ة', 'ه'
                                        ),
                                        'ک', 'ك'
                                    ),
                                    'ی', 'ي'
                                ),
                                'ۀ', 'ه'
                            ),
                            '[\u064B-\u0652\u0670\u065F\u0640]', '', 'g'  -- harakat + tatweel
                        ),
                        '[\u200C\u200D\u200E\u200F\u2060]', '', 'g'        -- zero-width & directional
                    )
                );
                $$ LANGUAGE SQL IMMUTABLE;
                """
            )

        # Trigram indexes for customer search (name + wa_id) on normalized/lowercase forms
        with contextlib.suppress(Exception):
            conn.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_customers_customer_name_norm_trgm ON customers USING GIN (normalize_arabic(customer_name) gin_trgm_ops);"
            )
        with contextlib.suppress(Exception):
            conn.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_customers_customer_name_trgm ON customers USING GIN (lower(customer_name) gin_trgm_ops);"
            )
        with contextlib.suppress(Exception):
            conn.exec_driver_sql(
                "CREATE INDEX IF NOT EXISTS ix_customers_wa_id_trgm ON customers USING GIN (lower(wa_id) gin_trgm_ops);"
            )
    except Exception:
        # Best-effort; ignore on non-PostgreSQL or restricted environments
        pass

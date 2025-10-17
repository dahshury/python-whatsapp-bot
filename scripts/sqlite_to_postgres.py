import contextlib
import os
import sqlite3
from collections.abc import Iterable
from typing import Any

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert


def get_sqlite_path() -> str:
    # Heuristics for legacy location
    candidates = [
        os.environ.get("DB_PATH"),
        os.path.join(os.getcwd(), "data", "threads_db.sqlite"),
        os.path.join(os.getcwd(), "threads_db.sqlite"),
    ]
    for c in candidates:
        if c and os.path.isfile(c):
            return c
    raise FileNotFoundError(
        "Could not find legacy SQLite database. Set DB_PATH or place threads_db.sqlite under ./data/"
    )


def batched(iterable: Iterable[Any], size: int = 500) -> Iterable[list[Any]]:
    batch: list[Any] = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def checkpoint_sqlite_wal(sqlite_path: str) -> None:
    """Safely checkpoint and truncate WAL before read-only migration.

    Uses synchronous=FULL and wal_checkpoint(TRUNCATE) to merge WAL content
    into the main DB file. Best-effort; continues on failure.
    """
    print(f"Checkpointing WAL for {sqlite_path}...")
    try:
        # Use uri to avoid file locking surprises and ensure rw access
        conn = sqlite3.connect(f"file:{sqlite_path}?mode=rwc", uri=True, timeout=10.0)
        with contextlib.suppress(Exception):
            conn.execute("PRAGMA busy_timeout = 10000;")
        with contextlib.suppress(Exception):
            conn.execute("PRAGMA synchronous=FULL;")
        try:
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
            print("  ✓ WAL checkpoint(TRUNCATE) succeeded")
        except Exception:
            # Try a softer full checkpoint
            try:
                conn.execute("PRAGMA wal_checkpoint(FULL);")
                print("  ✓ WAL checkpoint(FULL) succeeded (fallback)")
            except Exception:
                print("  ⚠ WAL checkpoint failed; proceeding anyway")
                pass
        conn.close()
    except Exception:
        # Best-effort; proceed anyway
        print("  ⚠ Could not open SQLite for checkpoint; proceeding anyway")
        pass


def main() -> None:
    print("=" * 60)
    print("SQLite → PostgreSQL Migration")
    print("=" * 60)
    # Import models and Postgres engine from app
    from app.db import (
        Base,
        ConversationModel,
        CustomerModel,
        NotificationEventModel,
        ReservationModel,
        SessionLocal,
        VacationPeriodModel,
    )
    from app.db import (
        engine as pg_engine,
    )

    sqlite_path = get_sqlite_path()
    print(f"Using legacy SQLite at: {sqlite_path}")

    # Ensure WAL is merged first
    checkpoint_sqlite_wal(sqlite_path)

    print("\nConnecting to PostgreSQL and creating schema...")
    # Ensure target schema exists
    Base.metadata.create_all(bind=pg_engine)
    print("  ✓ Schema ready")

    print("\nOpening SQLite database (read-only)...")
    # Read from SQLite
    sqlite_conn = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    sqlite_conn.row_factory = sqlite3.Row
    print("  ✓ SQLite connection opened")

    print("\nMigrating data...")
    with SessionLocal() as pg_session:
        # Customers
        print("  → Customers...", end=" ", flush=True)
        try:
            rows = sqlite_conn.execute(
                "SELECT wa_id, customer_name, age, age_recorded_at FROM customers"
            ).fetchall()
        except sqlite3.OperationalError:
            # age/age_recorded_at may not exist in old schema
            rows = sqlite_conn.execute(
                "SELECT wa_id, customer_name FROM customers"
            ).fetchall()
        if rows:
            stmt = pg_insert(CustomerModel.__table__).values([dict(r) for r in rows])
            stmt = stmt.on_conflict_do_nothing(index_elements=[CustomerModel.wa_id])
            pg_session.execute(stmt)
            pg_session.commit()
            print(f"{len(rows)} rows")
        else:
            print("0 rows")

        # Conversation
        print("  → Conversation...", end=" ", flush=True)
        rows = sqlite_conn.execute(
            "SELECT id, wa_id, role, message, date, time FROM conversation"
        ).fetchall()
        if rows:
            for batch in batched(rows, 1000):
                stmt = pg_insert(ConversationModel.__table__).values(
                    [dict(r) for r in batch]
                )
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=[ConversationModel.id]
                )
                pg_session.execute(stmt)
            pg_session.commit()
            pg_session.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('conversation','id'), (SELECT COALESCE(MAX(id),0) FROM conversation))"
                )
            )
            pg_session.commit()
            print(f"{len(rows)} rows")
        else:
            print("0 rows")

        # Reservations
        print("  → Reservations...", end=" ", flush=True)
        rows = sqlite_conn.execute(
            "SELECT id, wa_id, date, time_slot, type, status, cancelled_at, created_at, updated_at FROM reservations"
        ).fetchall()
        if rows:
            for batch in batched(rows, 1000):
                stmt = pg_insert(ReservationModel.__table__).values(
                    [dict(r) for r in batch]
                )
                stmt = stmt.on_conflict_do_nothing(index_elements=[ReservationModel.id])
                pg_session.execute(stmt)
            pg_session.commit()
            pg_session.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('reservations','id'), (SELECT COALESCE(MAX(id),0) FROM reservations))"
                )
            )
            pg_session.commit()
            print(f"{len(rows)} rows")
        else:
            print("0 rows")

        # Vacation periods
        print("  → Vacation periods...", end=" ", flush=True)
        rows = sqlite_conn.execute(
            "SELECT id, start_date, end_date, duration_days, title, created_at, updated_at FROM vacation_periods"
        ).fetchall()
        if rows:
            for batch in batched(rows, 1000):
                stmt = pg_insert(VacationPeriodModel.__table__).values(
                    [dict(r) for r in batch]
                )
                stmt = stmt.on_conflict_do_nothing(
                    index_elements=[VacationPeriodModel.id]
                )
                pg_session.execute(stmt)
            pg_session.commit()
            pg_session.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('vacation_periods','id'), (SELECT COALESCE(MAX(id),0) FROM vacation_periods))"
                )
            )
            pg_session.commit()
            print(f"{len(rows)} rows")
        else:
            print("0 rows")

        # Notification events
        print("  → Notification events...", end=" ", flush=True)
        try:
            rows = sqlite_conn.execute(
                "SELECT id, event_type, ts_iso, data, created_at FROM notification_events"
            ).fetchall()
            if rows:
                for batch in batched(rows, 1000):
                    stmt = pg_insert(NotificationEventModel.__table__).values(
                        [dict(r) for r in batch]
                    )
                    stmt = stmt.on_conflict_do_nothing(
                        index_elements=[NotificationEventModel.id]
                    )
                    pg_session.execute(stmt)
                pg_session.commit()
                pg_session.execute(
                    text(
                        "SELECT setval(pg_get_serial_sequence('notification_events','id'), (SELECT COALESCE(MAX(id),0) FROM notification_events))"
                    )
                )
                pg_session.commit()
                print(f"{len(rows)} rows")
            else:
                print("0 rows")
        except sqlite3.OperationalError:
            # Table may not exist in legacy db
            print("(table not found, skipped)")
            pass

    sqlite_conn.close()
    print("\n" + "=" * 60)
    print("✓ Migration completed successfully")
    print("=" * 60)


if __name__ == "__main__":
    main()

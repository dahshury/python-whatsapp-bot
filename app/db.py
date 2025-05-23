import sqlite3
import os
import logging

# Define the SQLite database file path
# Use environment variable if set, otherwise default to current working directory
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.getcwd(), "threads_db.sqlite"))

def get_connection():
    """Return a new SQLite connection with rows as dictionaries."""
    # Use WAL journaling and longer timeout to handle concurrent access
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        # Enable Write-Ahead Logging and set busy_timeout for concurrency
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
    except Exception:
        pass
    return conn

def initialize_db():
    """Initialize the SQLite database and create necessary tables and indexes if they don't exist."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Table for threads (each WhatsApp ID has one thread record)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS threads (
            wa_id TEXT PRIMARY KEY,
            thread_id TEXT
        )
        """)
        # Table for conversation messages
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wa_id TEXT,
            role TEXT,
            message TEXT,
            date TEXT,
            time TEXT,
            FOREIGN KEY (wa_id) REFERENCES threads(wa_id)
        )
        """)
        # Table for reservations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wa_id TEXT,
            customer_name TEXT,
            date TEXT,
            time_slot TEXT,
            type INTEGER CHECK(type IN (0, 1)),
            FOREIGN KEY (wa_id) REFERENCES threads(wa_id)
        )
        """)
        # Table for monitoring cancelled reservations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cancelled_reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wa_id TEXT,
            customer_name TEXT,
            date TEXT,
            time_slot TEXT,
            type INTEGER CHECK(type IN (0, 1)),
            cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (wa_id) REFERENCES threads(wa_id)
            )
        """)
        
        # Create Indexes if they don't exist
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_wa_id ON reservations(wa_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(date, time_slot);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cancelled_reservations_wa_id ON cancelled_reservations(wa_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_cancelled_reservations_date_time ON cancelled_reservations(date, time_slot);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversation_wa_id ON conversation(wa_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversation_wa_id_date_time ON conversation(wa_id, date, time);")
        # Note: idx_threads_wa_id is not needed as wa_id is PRIMARY KEY in threads table.
        
        conn.commit()
    except Exception as e:
        logging.error(f"Error creating database tables or indexes, {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

# Initialize the database upon module import
initialize_db()

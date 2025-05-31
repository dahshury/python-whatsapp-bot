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
        
        # Table for customers (renamed from threads, now includes customer_name)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            wa_id TEXT PRIMARY KEY,
            customer_name TEXT
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
            FOREIGN KEY (wa_id) REFERENCES customers(wa_id)
        )
        """)
        
        # Table for reservations with soft deletion support
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wa_id TEXT,
            date TEXT,
            time_slot TEXT,
            type INTEGER CHECK(type IN (0, 1)),
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'cancelled')),
            cancelled_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (wa_id) REFERENCES customers(wa_id)
        )
        """)
        
        # Create Indexes if they don't exist
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_wa_id ON customers(wa_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_wa_id ON reservations(wa_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_date_time ON reservations(date, time_slot);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_wa_id_status ON reservations(wa_id, status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reservations_date_time_status ON reservations(date, time_slot, status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversation_wa_id ON conversation(wa_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_conversation_wa_id_date_time ON conversation(wa_id, date, time);")
        
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

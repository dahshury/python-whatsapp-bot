import sqlite3
import os

# Define the SQLite database file path
DB_PATH = os.path.join(os.getcwd(), "threads_db.sqlite")

def get_connection():
    """Return a new SQLite connection with rows as dictionaries."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_db():
    """Initialize the SQLite database and create necessary tables if they don't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    # Table for threads (each WhatsApp ID has one thread record)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS threads (
        wa_id TEXT PRIMARY KEY,
        thread_id TEXT
    )
    ''')
    # Table for conversation messages
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS conversation (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wa_id TEXT,
        role TEXT,
        message TEXT,
        date TEXT,
        time TEXT,
        FOREIGN KEY (wa_id) REFERENCES threads(wa_id)
    )
    ''')
    # Table for reservations
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wa_id TEXT,
        date TEXT,
        time_slot TEXT,
        FOREIGN KEY (wa_id) REFERENCES threads(wa_id)
    )
    ''')
    conn.commit()
    conn.close()

# Initialize the database upon module import
initialize_db()

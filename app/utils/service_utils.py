import asyncio
from app.db import get_connection
import datetime
from zoneinfo import ZoneInfo
from hijri_converter import convert

# Global in-memory dictionary to store asyncio locks per user (wa_id)
global_locks = {}

def get_lock(wa_id):
    """
    Retrieve or create an asyncio.Lock for the given WhatsApp ID.
    Also record a flag in the shelve under the key "locks" for tracking.
    """
    if wa_id not in global_locks:
        global_locks[wa_id] = asyncio.Lock()
    return global_locks[wa_id]

def check_if_thread_exists(wa_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT thread_id FROM threads WHERE wa_id = ?", (wa_id,))
    row = cursor.fetchone()
    conn.close()
    return row["thread_id"] if row else None

def store_thread(wa_id, thread_id):
    conn = get_connection()
    cursor = conn.cursor()
    # Use INSERT OR REPLACE to update existing record if necessary
    cursor.execute(
        "INSERT OR REPLACE INTO threads (wa_id, thread_id) VALUES (?, ?)",
        (wa_id, thread_id)
    )
    conn.commit()
    conn.close()
        
def parse_unix_timestamp(timestamp, to_hijri=False):
    """
    Convert a Unix timestamp to formatted date and time strings.
    """
    timestamp = int(timestamp)
    dt_utc = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
    saudi_timezone = ZoneInfo("Asia/Riyadh")
    dt_saudi = dt_utc.astimezone(saudi_timezone)
    
    if to_hijri:
        hijri_date = convert.Gregorian(dt_saudi.year, dt_saudi.month, dt_saudi.day).to_hijri()
        date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
    else:
        date_str = dt_saudi.strftime("%Y-%m-%d")
    
    time_str = dt_saudi.strftime("%H:%M")
    return date_str, time_str
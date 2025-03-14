import asyncio
from app.db import get_connection
import datetime
from datetime import date, timedelta
from zoneinfo import ZoneInfo
from dateutil import parser  # Requires: pip install python-dateutil
import platform
import phonenumbers
import re
from hijri_converter import convert
import logging

# Global in-memory dictionary to store asyncio locks per user (wa_id)
global_locks = {}

def get_tomorrow_reservations():
    """
    Retrieve reservations for tomorrow from the database.
    
    Returns:
        list: A list of reservation records for tomorrow.
    """
    conn = get_connection()
    cursor = conn.cursor()
    
    # Calculate tomorrow's date
    today = datetime.datetime.now(ZoneInfo("Asia/Riyadh"))
    tomorrow = today + datetime.timedelta(days=1)
    tomorrow_date_str = tomorrow.strftime("%Y-%m-%d")
    
    # Query the database for reservations for tomorrow
    cursor.execute("SELECT * FROM reservations WHERE date = ?", (tomorrow_date_str,))
    reservations = cursor.fetchall()
    
    conn.close()
    return reservations

def find_nearest_time_slot(target_slot, available_slots):
    """
    Find the nearest available time slot from available_slots relative to target_slot.

    Parameters:
        target_slot (str): A time slot string in the format "%I:%M %p" (e.g., "11:00 AM")
        available_slots (iterable): An iterable of time slot strings in the same format.

    Returns:
        str or None: The nearest available time slot, or None if none found.
    """
    from datetime import datetime
    try:
        target = datetime.strptime(target_slot, "%I:%M %p")
    except ValueError:
        return None

    best_slot = None
    # We'll use a tuple (diff, direction) as the key for comparison.
    # diff: absolute difference in minutes from the target.
    # direction: 0 if the slot is earlier than or equal to the target, 1 if later.
    # This way, in the event of a tie (equal diff), a slot earlier than the target will be chosen.
    best_key = None

    for slot in available_slots:
        try:
            current = datetime.strptime(slot, "%I:%M %p")
        except ValueError:
            continue  # Skip slots that cannot be parsed
        
        # Calculate the absolute difference in minutes.
        diff = abs((current.hour * 60 + current.minute) - (target.hour * 60 + target.minute))
        # Set direction: 0 if current <= target (i.e. previous or exact match), 1 if after target.
        direction = 0 if current <= target else 1
        current_key = (diff, direction)
        
        if best_key is None or current_key < best_key:
            best_key = current_key
            best_slot = slot

    return best_slot

def get_all_reservations(future=True, cancelled_only=False):
    """
    Get all reservations from the database, grouped by wa_id, sorted by date and time_slot.
    If `future` is True, only returns reservations for today and future dates.
    If `cancelled` is True, only returns the cancelled reservations. 
    """
    db = "reservations" if not cancelled_only else "cancelled_reservations"
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Prepare the query based on the future flag.
        if future:
            today = date.today().isoformat()
            query = f"""
                SELECT wa_id, customer_name, date, time_slot, type 
                FROM {db} 
                WHERE date >= ?
                ORDER BY wa_id ASC, date ASC, time_slot ASC
            """
            cursor.execute(query, (today,))
        else:
            query = f"""
                SELECT wa_id, customer_name, date, time_slot, type 
                FROM {db} 
                ORDER BY wa_id ASC, date ASC, time_slot ASC
            """
            cursor.execute(query)
        
        rows = cursor.fetchall()
        conn.close()

        # Structuring the output as a grouped dictionary
        reservations = {}
        for row in rows:
            user_id = row['wa_id']
            if user_id not in reservations:
                reservations[user_id] = []
            reservations[user_id].append({
                "customer_name": row['customer_name'],
                "date": row['date'],
                "time_slot": row['time_slot'],
                "type": row['type']
            })

        return reservations

    except Exception as e:
        logging.error(f"Function call get_all_reservations failed, error: {e}")
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        return result

def get_all_conversations(wa_id=None, recent=None):
    """
    Get all conversations for a specific user (wa_id) from the database. If no wa_id is provided, all conversations in the database are returned.
    Group them by wa_id, then sort by date and time.
    If `recent` is provided, it filters conversations based on the specified period ('year', 'month', 'week', 'day').
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Determine the date filter based on the 'recent' parameter
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        if recent == 'year':
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif recent == 'month':
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif recent == 'week':
            start_date = now - timedelta(days=now.weekday())
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        elif recent == 'day':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = None

        # Filtering by wa_id if provided
        if wa_id:
            if start_date:
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE wa_id = ? AND date || ' ' || time >= ?
                    ORDER BY date ASC, time ASC
                """
                cursor.execute(query, (wa_id, start_date.strftime("%Y-%m-%d %H:%M")))
            else:
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE wa_id = ? 
                    ORDER BY date ASC, time ASC
                """
                cursor.execute(query, (wa_id,))
        else:
            if start_date:
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE date || ' ' || time >= ?
                    ORDER BY wa_id ASC, date ASC, time ASC
                """
                cursor.execute(query, (start_date.strftime("%Y-%m-%d %H:%M"),))
            else:
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    ORDER BY wa_id ASC, date ASC, time ASC
                """
                cursor.execute(query)

        rows = cursor.fetchall()
        conn.close()

        # Structuring the output as a grouped dictionary
        conversations = {}
        for row in rows:
            user_id = row['wa_id']
            if user_id not in conversations:
                conversations[user_id] = []
            conversations[user_id].append({
                "role": row['role'],
                "message": row['message'],
                "date": row['date'],
                "time": row['time']
            })

        return conversations

    except Exception as e:
        logging.error(f"Function call get_all_conversations failed, error: {e}")
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        return result
    
def append_message(wa_id, role, message, date_str, time_str):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Ensure a thread record exists for this wa_id
        cursor.execute("INSERT OR IGNORE INTO threads (wa_id, thread_id) VALUES (?, ?)", (wa_id, None))
        # Insert the conversation message
        cursor.execute(
            "INSERT INTO conversation (wa_id, role, message, date, time) VALUES (?, ?, ?, ?, ?)",
            (wa_id, role, message, date_str, time_str)
        )
        conn.commit()
    except Exception as e:
        logging.error(f"Error appending message to database: {e}")
    finally:
        conn.close()

def get_lock(wa_id):
    """
    Retrieve or create an asyncio.Lock for the given WhatsApp ID.
    Also record a flag in the sqlite database under the key "locks" for tracking.
    """
    if wa_id not in global_locks:
        global_locks[wa_id] = asyncio.Lock()
    return global_locks[wa_id]

def is_valid_number(phone_number, ar=False):
    if not phonenumbers.is_valid_number(phonenumbers.parse("+" + str(phone_number))): 
        if ar:
            message = "رقم الهاتف غير صالح."
            
        else:
            message = "Invalid phone number."
        result = {"success": False, "message": message}
        return result
    else:
        return True
def check_if_thread_exists(wa_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT thread_id FROM threads WHERE wa_id = ?", (wa_id,))
    row = cursor.fetchone()
    conn.close()
    return row["thread_id"] if row else None

def retrieve_messages(wa_id):
    """
    Retrieve message history for a user from the database and format for Claude API.
    """
    try:
        make_thread(wa_id)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Retrieve conversation history
        cursor.execute(
            "SELECT role, message FROM conversation WHERE wa_id = ? ORDER BY id ASC",
            (wa_id,)
        )
        rows = cursor.fetchall()
        messages = [dict(row) for row in rows] if rows else []
        conn.close()
        
        # Format messages for Claude API
        claude_messages = []
        for msg in messages:
            claude_messages.append({
                "role": "assistant" if msg["role"] != "user" else "user",
                "content": msg["message"]
            })
        
        return claude_messages
    except Exception as e:
        logging.error(f"Error retrieving messages from database: {e}")
        return []

def make_thread(wa_id, thread_id=None):
    """
    Ensures that a thread record exists for the given WhatsApp ID (wa_id).
    If no thread record exists for the provided wa_id, a new record is inserted
    into the 'threads' table with the wa_id and the provided thread_id.
    Args:
        wa_id (str): The WhatsApp ID for which to ensure a thread record exists.
        thread_id (str, optional): The thread ID to store. Defaults to None.
    Returns:
        None
    """
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

def parse_time(time_str):
    """
    Parse a time string and return it in 12-hour AM/PM format.
    If no AM/PM indicator is present and the time is before noon,
    the function assumes the time is PM.
    """
    # Replace Arabic AM/PM with English equivalents
    time_str = time_str.replace('ص', 'AM').replace('م', 'PM')
    
    # Normalize the input string
    normalized = re.sub(r'\s+', ' ', time_str.strip().upper())
    try:
        # Parse the string into a datetime object (date is arbitrary)
        dt = parser.parse(normalized)
        
        # Choose the time format specifier based on the operating system.
        # On Windows, use '%#I:%M %p'; on Unix-based systems, use '%-I:%M %p'
        if platform.system() == "Windows":
            time_format = "%#I:%M %p"
        else:
            time_format = "%-I:%M %p"
        
        # Return the time formatted in the chosen format
        return dt.strftime(time_format)
    except Exception as e:
        logging.error("Error while parsing time: {e}")
        return
            
def parse_gregorian_date(date_str):
    """
    Parse a Gregorian date string with explicit format handling.
    Priority given to DD-MM-YYYY format.
    Returns the date in ISO 8601 format: YYYY-MM-DD.
    """
    # First try specific formats with priority to DD-MM-YYYY
    formats_to_try = [
        "%d-%m-%Y",  # DD-MM-YYYY
        "%Y-%m-%d",  # YYYY-MM-DD
        "%d/%m/%Y",  # DD/MM/YYYY
        "%Y/%m/%d",  # YYYY/MM/DD
        "%m-%d-%Y",  # MM-DD-YYYY (lower priority)
        "%m/%d/%Y"   # MM/DD/YYYY (lower priority)
    ]
    
    for fmt in formats_to_try:
        try:
            dt = datetime.datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    # If specific formats fail, try dateutil with dayfirst=True
    try:
        dt = parser.parse(date_str, dayfirst=True)
        return dt.strftime("%Y-%m-%d")
    except Exception as e:
        raise ValueError(f"Invalid Gregorian date format: {date_str}. Error: {e}")

def parse_hijri_date(date_str):
    """
    Parse a Hijri date string that might be in various non-ISO-like formats.
    Returns the date in Gregorian format: YYYY-MM-DD.
    """
    # If already in ISO-like format (e.g. "1447-09-10"), convert to Gregorian.
    if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
        hijri_date = convert.Hijri(*map(int, date_str.split('-')))
        gregorian_date = hijri_date.to_gregorian()
        return f"{gregorian_date.year}-{gregorian_date.month:02d}-{gregorian_date.day:02d}"

    # Prepare the input by lowercasing and removing commas.
    s = date_str.lower().replace(',', '')

    # Define a mapping for common Hijri month names.
    hijri_months = {
        "muharram": "01",
        "safar": "02",
        "rabi' al-awwal": "03",
        "rabi al-awwal": "03",
        "rabi1": "03",
        "rabi i": "03",
        "rabi' al-thani": "04",
        "rabi al-thani": "04",
        "rabi2": "04",
        "rabi ii": "04",
        "jumada al-awwal": "05",
        "jumada1": "05",
        "jumada i": "05",
        "jumada al-thani": "06",
        "jumada2": "06",
        "jumada ii": "06",
        "rajab": "07",
        "sha'ban": "08",
        "shaban": "08",
        "ramadan": "09",
        "shawwal": "10",
        "dhu al-qadah": "11",
        "dhu al-qidah": "11",
        "dhu al-hijjah": "12",
        "dhu al-hijja": "12"
    }

    # Try to find a month name in the string.
    found_month = None
    for name, num in hijri_months.items():
        if name in s:
            found_month = num
            break

    # Extract all numeric parts from the string.
    numbers = re.findall(r"\d+", s)

    if found_month and len(numbers) >= 2:
        # Assume the first number is the day and the last is the year.
        day = numbers[0]
        year = numbers[-1]
        hijri_date = convert.Hijri(int(year), int(found_month), int(day))
        gregorian_date = hijri_date.to_gregorian()
        return f"{gregorian_date.year}-{gregorian_date.month:02d}-{gregorian_date.day:02d}"
    
    # If no month name is found, assume the date is fully numeric.
    if len(numbers) == 3:
        # Heuristic: if the first number is 4 digits, assume it's year-month-day.
        if len(numbers[0]) == 4:
            year, month, day = numbers
        else:
            # Otherwise, assume day-month-year (common for Hijri dates).
            day, month, year = numbers
        hijri_date = convert.Hijri(int(year), int(month), int(day))
        gregorian_date = hijri_date.to_gregorian()
        return f"{gregorian_date.year}-{gregorian_date.month:02d}-{gregorian_date.day:02d}"

    raise ValueError(f"Invalid Hijri date format: {date_str}")

def parse_date(date_str, hijri=False):
    """
    Parse a date string (Hijri or Gregorian) and return it in ISO-like format (YYYY-MM-DD).
    """
    if hijri:
        return parse_hijri_date(date_str)
    else:
        return parse_gregorian_date(date_str)
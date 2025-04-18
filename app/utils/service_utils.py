import asyncio
import logging
import platform
import re
import datetime
from datetime import date, timedelta
from zoneinfo import ZoneInfo

import phonenumbers
from dateutil import parser  # Requires: pip install python-dateutil
from hijri_converter import convert

from app.config import config
from app.db import get_connection

# Global in-memory dictionary to store asyncio locks per user (wa_id)
global_locks = {}

# Helper to standardize API responses across services
def format_response(success: bool, data=None, message: str = None):
    """
    Format a consistent response:
      - success (bool)
      - data (optional payload)
      - message (optional user-facing message)
    """
    resp = {"success": success}
    if data is not None:
        resp["data"] = data
    if message is not None:
        resp["message"] = message
    return resp

def fix_unicode_sequence(customer_name):
    """
    Fixes Unicode escape sequences in customer names.
    Args:
        customer_name (str): The customer name string to be fixed.
    Returns:
        str: The fixed customer name string.
    """
    if customer_name and isinstance(customer_name, str):
        try:
            # Check if the name contains Unicode escape sequences (like \u0623)
            if '\\u' in customer_name or 'u0' in customer_name:
                # Try to decode proper Unicode escape sequences
                if '\\u' in customer_name:
                    customer_name = customer_name.encode().decode('unicode_escape')
                # Handle improperly formatted sequences like u0623 instead of \u0623
                elif 'u0' in customer_name:
                    # Convert u0623 format to \u0623 format
                    customer_name = re.sub(r'u([0-9a-fA-F]{4})', r'\\u\1', customer_name)
                    customer_name = customer_name.encode().decode('unicode_escape')
        except Exception as e:
            logging.warning(f"Failed to decode Unicode in customer name: {e}")
    return customer_name


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
    Only returns slots that are in the future from the current time.

    Parameters:
        target_slot (str): A time slot string in the format "%I:%M %p" (e.g., "11:00 AM")
        available_slots (iterable): An iterable of time slot strings in the same format.

    Returns:
        str or None: The nearest available time slot, or None if none found.
    """
    try:
        target = datetime.datetime.strptime(target_slot, "%I:%M %p")
    except ValueError:
        return None

    # Get current time
    now = datetime.datetime.now(ZoneInfo("Asia/Riyadh"))
    current_time = datetime.datetime.combine(
        now.date(), 
        datetime.time(now.hour, now.minute),
        tzinfo=ZoneInfo("Asia/Riyadh")
    )

    best_slot = None
    best_key = None

    for slot in available_slots:
        try:
            slot_time = datetime.datetime.strptime(slot, "%I:%M %p")
            # Create a datetime with today's date and the slot time
            slot_datetime = datetime.datetime.combine(
                now.date(), 
                datetime.time(slot_time.hour, slot_time.minute),
                tzinfo=ZoneInfo("Asia/Riyadh")
            )
            
            # Skip slots that are in the past
            if slot_datetime <= current_time:
                continue
                
            # Calculate the absolute difference in minutes from target
            diff = abs((slot_time.hour * 60 + slot_time.minute) - (target.hour * 60 + target.minute))
            # Set direction: 0 if slot_time <= target, 1 if after target
            direction = 0 if slot_time <= target else 1
            current_key = (diff, direction)
            
            if best_key is None or current_key < best_key:
                best_key = current_key
                best_slot = slot
                
        except ValueError:
            continue  # Skip slots that cannot be parsed

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

def get_all_conversations(wa_id=None, recent=None, limit=0):
    """
    Get all conversations for a specific user (wa_id) from the database. If no wa_id is provided, all conversations in the database are returned.
    Group them by wa_id, then sort by date and time.
    If `recent` is provided, it filters to include only users who have at least one message in the specified period ('year', 'month', 'week', 'day'),
    but returns all messages for those users (not just the recent ones).
    If `limit` is provided and greater than 0, it limits the number of messages returned per user to the most recent n messages.
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

        # First, get the list of wa_ids that have messages in the recent period
        recent_wa_ids = []
        if start_date and not wa_id:
            query = """
                SELECT DISTINCT wa_id
                FROM conversation 
                WHERE date || ' ' || time >= ?
            """
            cursor.execute(query, (start_date.strftime("%Y-%m-%d %H:%M"),))
            recent_wa_ids = [row['wa_id'] for row in cursor.fetchall()]

        # Now get all conversations for the filtered wa_ids or specific wa_id
        if wa_id:
            if limit > 0:
                # Get the most recent n messages for the specific user
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE wa_id = ? 
                    ORDER BY date DESC, time DESC
                    LIMIT ?
                """
                cursor.execute(query, (wa_id, limit))
            else:
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE wa_id = ? 
                    ORDER BY date ASC, time ASC
                """
                cursor.execute(query, (wa_id,))
        elif recent_wa_ids:
            # Use the list of wa_ids that have recent messages
            placeholders = ','.join(['?'] * len(recent_wa_ids))
            if limit > 0:
                # This is more complex - we need to get the most recent n messages for each user
                # We'll handle this after fetching all messages
                query = f"""
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE wa_id IN ({placeholders})
                    ORDER BY wa_id ASC, date DESC, time DESC
                """
            else:
                query = f"""
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    WHERE wa_id IN ({placeholders})
                    ORDER BY wa_id ASC, date ASC, time ASC
                """
            cursor.execute(query, recent_wa_ids)
        else:
            if limit > 0:
                # We'll handle the limit per user after fetching
                query = """
                    SELECT wa_id, role, message, date, time 
                    FROM conversation 
                    ORDER BY wa_id ASC, date DESC, time DESC
                """
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
    """
    Validate if a phone number is a valid WhatsApp number.
    
    Args:
        phone_number (str): The phone number to validate (with or without + prefix)
        ar (bool): Whether to return error messages in Arabic
        
    Returns:
        True if valid, or dict with error info if invalid
    """
    try:
        # Ensure we're working with a string
        phone_number = str(phone_number).strip()
        
        # Remove any '+' prefix if it exists to ensure consistent format
        if phone_number.startswith('+'):
            phone_number = phone_number[1:]
            
        # Basic length check - international numbers should be reasonable length
        if len(phone_number) < 8 or len(phone_number) > 15:
            message = "Phone number length is invalid (should be between 8-15 digits)."
            if ar:
                message = "طول رقم الهاتف غير صالح (يجب أن يكون بين 8-15 رقمًا)."
            return {"success": False, "message": message}
            
        # Check using phonenumbers library
        try:
            parsed_number = phonenumbers.parse("+" + phone_number)
            if not phonenumbers.is_valid_number(parsed_number):
                message = "Invalid phone number format."
                if ar:
                    message = "صيغة رقم الهاتف غير صالحة."
                return {"success": False, "message": message}
        except Exception as e:
            message = f"Invalid phone number: {str(e)}"
            if ar:
                message = "رقم الهاتف غير صالح."
            return {"success": False, "message": message}
            
        return True
    except Exception as e:
        logging.error(f"Phone validation error: {e}")
        message = "Phone validation error"
        if ar:
            message = "خطأ في التحقق من صحة رقم الهاتف"
        return {"success": False, "message": message}

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
    Convert a Unix timestamp to formatted date and time strings, including seconds.
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
    
    time_str = dt_saudi.strftime("%H:%M:%S")
    return date_str, time_str

def parse_time(time_str, to_24h=True):
    """
    Parse a time string and convert it to the specified format.
    
    Parameters:
        time_str (str): A time string in any recognizable format
        to_24h (bool): If True, returns time in 24-hour format (HH:MM), otherwise in 12-hour format (h:MM AM/PM)
    
    Returns:
        str: The formatted time string
    """
    # Replace Arabic AM/PM with English equivalents
    time_str = time_str.replace('ص', 'AM').replace('م', 'PM')
    
    # Normalize the input string
    normalized = re.sub(r'\s+', ' ', time_str.strip().upper())
    try:
        # Parse the string into a datetime object (date is arbitrary)
        dt = parser.parse(normalized)
        
        if to_24h:
            # Return 24-hour format for internal use and database storage
            return dt.strftime("%H:%M")
        else:
            # Return 12-hour format for user display
            # Choose the time format specifier based on the operating system
            if platform.system() == "Windows":
                time_format = "%#I:%M %p"
            else:
                time_format = "%-I:%M %p"
            return dt.strftime(time_format)
    except Exception as e:
        logging.error(f"Error while parsing time: {e}")
        return time_str  # Return original if parsing fails

def normalize_time_format(time_str, to_24h=True):
    """
    Convert a time string from one format to another.
    
    Parameters:
        time_str (str): A time string in either 12-hour (h:MM AM/PM) or 24-hour (HH:MM) format
        to_24h (bool): If True, converts to 24-hour format, otherwise to 12-hour format
    
    Returns:
        str: The time string in the requested format
    """
    try:
        # Try to determine if input is already in 24-hour format
        is_24h_format = ":" in time_str and " " not in time_str
        
        if is_24h_format:
            # Input is already in 24h format (HH:MM)
            if to_24h:
                return time_str  # Already in 24h format
            else:
                # Convert from 24h to 12h
                hour, minute = map(int, time_str.split(':'))
                dt = datetime.datetime(2000, 1, 1, hour, minute)
                
                # Format based on operating system
                if platform.system() == "Windows":
                    time_format = "%#I:%M %p"
                else:
                    time_format = "%-I:%M %p"
                return dt.strftime(time_format)
        else:
            # Input is probably in 12h format with AM/PM
            if not to_24h:
                return time_str  # Already in 12h format
            else:
                # Convert from 12h to 24h
                return parse_time(time_str, to_24h=True)
    
    except Exception as e:
        logging.error(f"Error normalizing time format: {e}")
        return time_str  # Return original if conversion fails

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
    Parse a date string (Hijri or Gregorian) and returns it in Gregorian ISO format (YYYY-MM-DD).
    """
    if hijri:
        return parse_hijri_date(date_str)
    else:
        return parse_gregorian_date(date_str)

def is_vacation_period(date_obj, vacation_dict=None):
    """
    Check if a given date falls within a vacation period.
    
    Parameters:
        date_obj (datetime.date): The date to check
        vacation_dict (dict, optional): Dictionary of vacation periods with start dates and durations
        
    Returns:
        tuple: (is_vacation, message)
            - is_vacation (bool): True if the date is within a vacation period
            - message (str or None): Vacation message if is_vacation is True, otherwise None
    """    
    try:
        # Set up the vacation dictionary if not provided
        if vacation_dict is None:
            vacation_dict = {}
            vacation_start_dates = config.get("VACATION_START_DATES", "")
            vacation_durations = config.get("VACATION_DURATIONS", "")
            
            # Only process if both values are non-empty strings
            if vacation_start_dates and vacation_durations and isinstance(vacation_start_dates, str) and isinstance(vacation_durations, str):
                try:
                    start_dates = [d.strip() for d in vacation_start_dates.split(',') if d.strip()]
                    durations = [int(d.strip()) for d in vacation_durations.split(',') if d.strip()]
                    
                    # Parse each date in Gregorian format
                    parsed_start_dates = []
                    for date_str in start_dates:
                        try:
                            parsed_date = parse_gregorian_date(date_str)
                            parsed_start_dates.append(parsed_date)
                        except ValueError as e:
                            logging.error(f"Error parsing vacation date {date_str}: {e}")
                    
                    if len(parsed_start_dates) == len(durations):
                        vacation_dict = {start_date: duration for start_date, duration in zip(parsed_start_dates, durations)}
                except (ValueError, TypeError) as e:
                    logging.error(f"Error parsing vacation dates: {e}")
                    # Continue with empty vacation_dict if parsing fails
        
        # Check if the date falls within any vacation period
        for start_day, duration in vacation_dict.items():
            try:
                start_date = datetime.datetime.strptime(start_day, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
                end_date = start_date + datetime.timedelta(days=duration)
                if start_date.date() <= date_obj <= end_date.date():
                    vacation_msg = config.get('VACATION_MESSAGE', 'The clinic is closed during this period.')
                    message = f"We are on vacation from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}. {vacation_msg}"
                    return True, message
            except (ValueError, TypeError) as e:
                logging.error(f"Error checking vacation period for date {start_day}: {e}")
                # Continue checking other dates if one fails
        
        return False, None
    except Exception as e:
        logging.error(f"Error in is_vacation_period: {e}")
        return False, None

def get_time_slots(date_str=None, check_vacation=True, to_24h=False):
    """
    Comprehensive function to get time slots for a specific date with all business rules applied.
    
    Parameters:
        date_str (str, optional): Gegorian iso-format date string to get time slots for.
                                  If provided, this will be converted to a date_obj
        check_vacation (bool): Whether to check if the date is during a vacation period (default: True)
        to_24h (bool): Whether to return time slots in 24-hour format (default: False)
        
    Returns:
        dict or tuple: 
            If not in vacation period: Dictionary of time slots with initial count of 0
            If in vacation period and check_vacation=True: Tuple (False, vacation_message)
            If error occurs: Dictionary with error information
            If date is invalid: Dictionary with error information
    
    Example:
        >>> get_time_slots("2023-10-15")
        {'11:00 AM': 0, '01:00 PM': 0, '03:00 PM': 0, '05:00 PM': 0}
        
        >>> get_time_slots("2023-10-15", to_24h=True)
        {'11:00': 0, '13:00': 0, '15:00': 0, '17:00': 0}
        
    """
    try:
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        
        # Convert date_str to date_obj if date_str is provided
        if date_str is not None:
            # First validate the date using is_valid_date_time
            is_valid, error_message, parsed_date_str, _ = is_valid_date_time(date_str)
            if not is_valid:
                return {"success": False, "message": error_message}
                
            date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
        else:
            date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
            # Ensure the provided date_obj is not in the past
            if date_obj < now.date():
                return {"success": False, "message": "Cannot get time slots for past dates."}
            
        # Check if the date falls within a vacation period
        if check_vacation:
            is_vacation, vacation_message = is_vacation_period(date_obj)
            if is_vacation:
                return {"success": False, "message": vacation_message or "We are on vacation at this time."}
        
        # Get day of week (0=Monday, 6=Sunday)
        day_of_week = date_obj.weekday()
        
        # Check if the date falls within Ramadan
        hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
        is_ramadan = hijri_date.month == 9
        
        # Define time slots in 12-hour format based on day and Ramadan status
        if day_of_week == 4:  # Friday
            available_12h = {}  # Clinic is closed on Fridays
        elif is_ramadan:
            available_12h = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(10, 15, 2)}  # 10 AM to 4 PM during Ramadan
        elif day_of_week == 5:  # Saturday
            available_12h = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(16, 21, 2)}  # 4 PM to 9 PM
        else:  # Sunday to Thursday
            available_12h = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(11, 17, 2)}  # 11 AM to 5 PM
        
        # Filter out past time slots if the date is today
        if date_obj == now.date():
            current_time = now.time()
            available_12h = filter_past_time_slots(available_12h, current_time)
        
        # Convert to 24-hour format if requested
        if to_24h:
            available_24h = {}
            for slot_12h, count in available_12h.items():
                slot_24h = normalize_time_format(slot_12h, to_24h=True)
                available_24h[slot_24h] = count
            return available_24h
        
        return available_12h
        
    except Exception as e:
        logging.error(f"Error getting time slots: {e}")
        return {"success": False, "message": f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."}

def validate_reservation_type(reservation_type, ar=False):
    """
    Validates that reservation_type is either 0 or 1.
    
    Parameters:
        reservation_type: The reservation type to validate (can be string or int)
        ar (bool): If True, returns error messages in Arabic
        
    Returns:
        tuple: (is_valid, result, parsed_type)
            is_valid (bool): True if valid, False otherwise
            result (dict): Error result dict if invalid, None if valid
            parsed_type (int): The parsed type as integer if valid, None if invalid
    """
    try:
        # Convert to integer if it's not already
        parsed_type = int(reservation_type)
        
        if parsed_type not in (0, 1):
            if ar:
                message = "نوع الحجز غير صالح. يجب أن يكون 0 أو 1."
            else:
                message = "Invalid reservation type. Must be 0 or 1."
            return False, {"success": False, "message": message}, None
            
        return True, None, parsed_type
    except (ValueError, TypeError):
        if ar:
            message = "نوع الحجز غير صالح. يجب أن يكون 0 أو 1."
        else:
            message = "Invalid reservation type. Must be 0 or 1."
        return False, {"success": False, "message": message}, None

def filter_past_time_slots(time_slots_dict, current_time=None):
    """
    Filter out time slots that have already passed from a dictionary of time slots.
    
    Parameters:
        time_slots_dict (dict): Dictionary of time slots
        current_time (datetime.time, optional): Current time for comparison. If None, uses the current time.
        
    Returns:
        dict: Dictionary of time slots with past slots removed
    """
    if not time_slots_dict:
        return {}
    
    # If current_time is not provided, use the current time
    if current_time is None:
        current_time = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh")).time()
    
    # Filter out past time slots
    return {
        time: count for time, count in time_slots_dict.items() 
        if datetime.datetime.strptime(time, "%I:%M %p").time() > current_time
    }

def is_valid_date_time(date_str, time_str=None, hijri=False):
    """
    Check if a given date and time (optional) are valid for scheduling 
    (not in the past, and if time is provided, not earlier on the same day).
    
    Parameters:
        date_str (str): Gregorian Date string to check
        time_str (str, optional): Time string to check (in either 12-hour or 24-hour format)
        hijri (bool): Flag indicating if the provided date string is in Hijri format
        
    Returns:
        tuple: (is_valid, message, parsed_date, parsed_time)
            - is_valid (bool): True if the date/time is valid for scheduling
            - message (str or None): Error message if is_valid is False, otherwise None
            - parsed_date (str): Parsed date in YYYY-MM-DD format
            - parsed_time (str): Parsed time in HH:MM (24-hour) format, or None if no time provided
    """
    try:
        # Parse the date and convert to a datetime.date object
        parsed_date_str = parse_date(date_str, hijri)
        date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
        
        # Get current date and time
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        today = now.date()
        
        # Default value for parsed_time
        parsed_time_str = None
        
        # Check if the date is in the past
        if date_obj < today:
            return False, "Cannot schedule in a past date.", parsed_date_str, parsed_time_str
        
        # If time string is provided, check if it's valid for today
        if time_str:
            parsed_time_str = parse_time(time_str, to_24h=True)
            
            if date_obj == today:
                # Convert time to datetime objects for comparison
                time_obj = datetime.datetime.strptime(parsed_time_str, "%H:%M").time()
                current_time = now.time()
                
                if time_obj <= current_time:
                    return False, "Cannot schedule at a time that has already passed.", parsed_date_str, parsed_time_str
        
        return True, None, parsed_date_str, parsed_time_str
    
    except Exception as e:
        return False, f"Invalid date or time format: {str(e)}", None, None

def delete_reservation(wa_id, date_str=None, time_slot=None, hijri=False, ar=False):
    """
    Hard delete reservation(s) for a customer, handling three cases:
    1) both date and time_slot: delete that specific slot
    2) only date: delete all reservations on that date
    3) neither provided: delete all reservations for this wa_id
    """
    # Validate WhatsApp ID
    is_valid = is_valid_number(wa_id, ar)
    if is_valid is not True:
        return is_valid

    # Parse date if provided
    parsed_date = None
    if date_str:
        try:
            parsed_date = parse_date(date_str, hijri=hijri)
        except Exception as e:
            msg = "تاريخ غير صالح." if ar else f"Invalid date format: {e}"
            return {"success": False, "message": msg}

    # Parse time if provided
    parsed_time = None
    if time_slot:
        try:
            parsed_time = normalize_time_format(time_slot, to_24h=True)
        except Exception as e:
            msg = "صيغة الوقت غير صالحة." if ar else f"Invalid time format: {e}"
            return {"success": False, "message": msg}

    # Perform deletion
    conn = get_connection()
    cursor = conn.cursor()
    if parsed_date is not None and parsed_time is not None:
        cursor.execute(
            "DELETE FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
            (wa_id, parsed_date, parsed_time)
        )
    elif parsed_date is not None:
        cursor.execute(
            "DELETE FROM reservations WHERE wa_id = ? AND date = ?",
            (wa_id, parsed_date)
        )
    else:
        cursor.execute(
            "DELETE FROM reservations WHERE wa_id = ?",
            (wa_id,)
        )

    removed = cursor.rowcount > 0
    conn.commit()
    conn.close()

    # Build response message
    if ar:
        if parsed_date and parsed_time:
            msg = "تمت إزالة الحجز." if removed else "حدث خطأ أثناء إزالة الحجز."
        elif parsed_date:
            msg = "تمت إزالة الحجوزات في ذلك التاريخ." if removed else "حدث خطأ أثناء إزالة الحجوزات."
        else:
            msg = "تمت إزالة جميع الحجوزات." if removed else "حدث خطأ أثناء إزالة الحجوزات."
    else:
        if parsed_date and parsed_time:
            msg = "Reservation removed." if removed else "Error occurred while removing the reservation."
        elif parsed_date:
            msg = "Reservations on that date removed." if removed else "Error occurred while removing reservations on that date."
        else:
            msg = "All reservations removed." if removed else "Error occurred while removing reservations."

    return {"success": True, "message": msg}
import asyncio
import logging
import platform
import re
import datetime
from datetime import timedelta
from zoneinfo import ZoneInfo

import phonenumbers
from dateutil import parser  # Requires: pip install python-dateutil
from hijri_converter import convert

from app.config import config
from app.db import get_connection
from app.i18n import get_message

# Global in-memory dictionary to store asyncio locks per user (wa_id)
global_locks = {}

# Helper to standardize API responses across services
def format_response(success: bool, data=None, message: str = None, status_code: int = None):
    """
    Format a consistent response:
      - success (bool)
      - data (optional payload)
      - message (optional user-facing message)
      - status_code (optional HTTP status code)
    """
    resp = {"success": success}
    if data is not None:
        resp["data"] = data
    if message is not None:
        resp["message"] = message
    if status_code is not None:
        return resp, status_code
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
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Calculate tomorrow's date
        today = datetime.datetime.now(ZoneInfo(config['TIMEZONE']))
        tomorrow = today + datetime.timedelta(days=1)
        tomorrow_date_str = tomorrow.strftime("%Y-%m-%d")
        # Query the database for ACTIVE reservations for tomorrow
        # Ensure cancelled reservations are excluded from reminder runs
        cursor.execute(
            "SELECT * FROM reservations WHERE date = ? AND status = 'active'",
            (tomorrow_date_str,)
        )
        rows = cursor.fetchall()
        conn.close()
        return format_response(True, data=[dict(r) for r in rows])
    except Exception as e:
        logging.error(f"get_tomorrow_reservations failed, error: {e}")
        return format_response(False, message=get_message("system_error_generic", error=str(e)))

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
        # Use our robust parse_time function
        target_24h = parse_time(target_slot, to_24h=True)
        target = datetime.datetime.strptime(target_24h, "%H:%M")
    except (ValueError, Exception):
        return None

    # Get current time
    now = datetime.datetime.now(tz=ZoneInfo(config['TIMEZONE']))
    current_time = now.time()

    closest_slot = None
    min_difference = float('inf')

    for slot in available_slots:
        try:
            # Use our robust parse_time function
            slot_24h = parse_time(slot, to_24h=True)
            slot_time = datetime.datetime.strptime(slot_24h, "%H:%M")
            
            # Check if this slot is in the future
            if slot_time.time() <= current_time:
                continue

            # Calculate difference (in minutes)
            diff = abs((slot_time - target).total_seconds() / 60)

            if diff < min_difference:
                min_difference = diff
                closest_slot = slot

        except (ValueError, Exception) as e:
            logging.error(f"Could not parse slot '{slot}' in find_nearest_time_slot: {e}")
            continue

    return closest_slot

def get_all_reservations(future=True, include_cancelled=False):
    """
    Retrieve all reservations from the database.
    
    Parameters:
        future (bool): If True, only return reservations for today and future dates.
                      If False, return all reservations.
        include_cancelled (bool): If True, include cancelled reservations in the results.
                                 If False, only return active reservations.
    
    Returns:
        dict: Dictionary with wa_id as keys and list of reservation dicts as values.
             Each reservation dict contains customer_name, date, time_slot, type, and cancelled flag.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Base query to get reservations (join with customers table for customer_name)
        base_query = """
            SELECT r.id, r.wa_id, c.customer_name, r.date, r.time_slot, r.type, r.status
            FROM reservations r
            JOIN customers c ON r.wa_id = c.wa_id
        """
        
        # Build WHERE conditions
        where_conditions = []
        params = []
        
        # Add date filter if future is True
        if future:
            # Use timezone-aware date for today
            today = datetime.datetime.now(ZoneInfo(config['TIMEZONE'])).date().isoformat()
            where_conditions.append("r.date >= ?")
            params.append(today)
        
        # Add status filter based on include_cancelled
        if not include_cancelled:
            where_conditions.append("r.status = 'active'")
        
        # Combine WHERE conditions
        where_clause = ""
        if where_conditions:
            where_clause = " WHERE " + " AND ".join(where_conditions)
        
        # Complete the query with where clause and ordering
        main_query = base_query + where_clause + " ORDER BY r.wa_id ASC, r.date ASC, r.time_slot ASC"
        
        # Execute the query
        cursor.execute(main_query, params)
        rows = cursor.fetchall()
        
        conn.close()

        # Structuring the output as a grouped dictionary
        reservations = {}
        
        # Process reservations
        for row in rows:
            user_id = row['wa_id']
            if user_id not in reservations:
                reservations[user_id] = []
            
            reservation = {
                "id": row['id'],
                "customer_name": row['customer_name'],
                "date": row['date'],
                "time_slot": row['time_slot'],
                "type": row['type'],
                "cancelled": row['status'] == 'cancelled'
            }
            
            reservations[user_id].append(reservation)

        # Return grouped reservations in standardized format
        return format_response(True, data=reservations)

    except Exception as e:
        logging.error(f"get_all_reservations failed, error: {e}")
        return format_response(False, message=get_message("system_error_contact_secretary"))

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
        now = datetime.datetime.now(tz=ZoneInfo(config['TIMEZONE']))
        if recent == 'year':
            # One full year back from now
            start_date = now - timedelta(days=365)
        elif recent == 'month':
            # One full month back from now
            start_date = now - timedelta(days=30)
        elif recent == 'week':
            # One full week back from now
            start_date = now - timedelta(days=7)
        elif recent == 'day':
            # One full day back from now
            start_date = now - timedelta(days=1)
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

        # Return grouped conversations in standardized format
        return format_response(True, data=conversations)

    except Exception as e:
        logging.error(f"get_all_conversations failed, error: {e}")
        return format_response(False, message=get_message("system_error_contact_secretary"))
    
def append_message(wa_id, role, message, date_str, time_str):
    """
    Append a message to the conversation database for a given WhatsApp user.
    Ensures that a customer record exists in the 'customers' table and then inserts
    the message into the 'conversation' table. Any database errors are caught
    and logged without interrupting execution.

    Args:
        wa_id (str): WhatsApp user identifier.
        role (str): Sender role (e.g., 'user', 'secretary').
        message (str): The message text to store.
        date_str (str): Message date in 'YYYY-MM-DD' format.
        time_str (str): Message time in 'HH:MM' format.

    Returns:
        None
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Ensure a customer record exists for this wa_id
        cursor.execute(
            "INSERT OR IGNORE INTO customers (wa_id, customer_name) VALUES (?, ?)",
            (wa_id, None)
        )
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
    """
    try:
        phone_number = str(phone_number).strip()
        if phone_number.startswith('+'):
            phone_number = phone_number[1:]
        # Basic length check
        if len(phone_number) < 8 or len(phone_number) > 15:
            # Phone number length error
            return format_response(False, message=get_message("phone_length_error", ar=ar))
        # Check using phonenumbers library
        try:
            parsed_number = phonenumbers.parse("+" + phone_number)
            if not phonenumbers.is_valid_number(parsed_number):
                # Phone number format error
                return format_response(False, message=get_message("phone_format_error", ar=ar))
        except Exception as e:
            # Invalid phone number with exception detail
            return format_response(False, message=get_message("phone_invalid", ar=ar, error=str(e)))
        return True
    except Exception as e:
        logging.error(f"Phone validation error: {e}")
        # General phone validation error
        return format_response(False, message=get_message("phone_validation_error", ar=ar))

def retrieve_messages(wa_id):
    """
    Retrieve message history for a user from the database and format for service consumption.
    """
    try:
        # Ensure a thread record exists
        make_thread(wa_id)
        # Use centralized conversation retrieval
        response = get_all_conversations(wa_id=wa_id)
        if not response.get("success", False):
            return []
        data = response.get("data", {})
        # Extract messages list for this user
        messages = data.get(wa_id) or data.get(str(wa_id), [])
        input_chat = []
        for msg in messages:
            input_chat.append({
                "role": "assistant" if msg["role"] != "user" else "user",
                "content": msg["message"]
            })
        return input_chat
    except Exception as e:
        logging.error(f"Error retrieving messages from database: {e}")
        return []

def make_thread(wa_id, customer_name=None):
    """
    Ensures that a customer record exists for the given WhatsApp ID (wa_id).
    If no customer record exists for the provided wa_id, a new record is inserted
    into the 'customers' table with the wa_id and customer_name.
    If a record exists, only updates customer_name if it's currently NULL/empty.
    Args:
        wa_id (str): The WhatsApp ID for which to ensure a customer record exists.
        customer_name (str, optional): The customer name to store. Defaults to None.
    Returns:
        None
    """
    conn = get_connection()
    cursor = conn.cursor()

    # First, check if customer exists
    cursor.execute("SELECT customer_name FROM customers WHERE wa_id = ?", (wa_id,))
    existing = cursor.fetchone()
    
    if existing is None:
        # Customer doesn't exist, create new record
        cursor.execute(
            "INSERT INTO customers (wa_id, customer_name) VALUES (?, ?)",
            (wa_id, customer_name)
        )
    else:
        # Customer exists, update fields that are currently NULL/empty
        updates = []
        params = []
        
        # Only update customer_name if provided and current value is NULL/empty
        if customer_name is not None and (existing["customer_name"] is None or existing["customer_name"].strip() == ""):
            updates.append("customer_name = ?")
            params.append(customer_name)
        
        # Execute update if there are changes
        if updates:
            params.append(wa_id)  # Add wa_id for WHERE clause
            cursor.execute(f"UPDATE customers SET {', '.join(updates)} WHERE wa_id = ?", params)
    
    conn.commit()
    conn.close()
        
def parse_unix_timestamp(timestamp, to_hijri=False):
    """
    Convert a Unix timestamp to formatted date and time strings, including seconds.
    """
    timestamp = int(timestamp)
    dt_utc = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
    saudi_timezone = ZoneInfo(config['TIMEZONE'])
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
        
    Raises:
        ValueError: If the time string cannot be parsed in any recognizable format
    """
    if not time_str or not isinstance(time_str, str):
        raise ValueError(f"Invalid time string: {time_str}")
    
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
        logging.debug(f"Error while parsing time with dateutil: {e}, trying manual parsing")
        
        # Manual parsing fallback for common formats
        try:
            # Handle 12-hour format (e.g., "11:00 PM", "1:30 AM")
            if "AM" in normalized or "PM" in normalized:
                # Extract time part and AM/PM
                time_part = normalized.replace("AM", "").replace("PM", "").strip()
                is_pm = "PM" in normalized
                
                # Parse hour and minute
                if ":" in time_part:
                    hour_str, minute_str = time_part.split(":")
                    hour = int(hour_str.strip())
                    minute = int(minute_str.strip())
                else:
                    hour = int(time_part.strip())
                    minute = 0
                
                # Validate hour and minute ranges
                if not (1 <= hour <= 12):
                    raise ValueError(f"Invalid hour in 12-hour format: {hour}")
                if not (0 <= minute <= 59):
                    raise ValueError(f"Invalid minute: {minute}")
                
                # Convert to 24-hour format
                if is_pm and hour != 12:
                    hour += 12
                elif not is_pm and hour == 12:
                    hour = 0
                
                # Create datetime object for formatting
                dt = datetime.datetime(2000, 1, 1, hour, minute)
                
                if to_24h:
                    return dt.strftime("%H:%M")
                else:
                    # Format back to 12-hour
                    if platform.system() == "Windows":
                        time_format = "%#I:%M %p"
                    else:
                        time_format = "%-I:%M %p"
                    return dt.strftime(time_format)
            
            # Handle 24-hour format (e.g., "14:30", "09:00")
            elif ":" in normalized:
                hour_str, minute_str = normalized.split(":", 1)  # Only split on first ':'
                hour = int(hour_str.strip())
                minute = int(minute_str.strip())
                
                # Validate hour and minute ranges
                if not (0 <= hour <= 23):
                    raise ValueError(f"Invalid hour in 24-hour format: {hour}")
                if not (0 <= minute <= 59):
                    raise ValueError(f"Invalid minute: {minute}")
                
                dt = datetime.datetime(2000, 1, 1, hour, minute)
                
                if to_24h:
                    return dt.strftime("%H:%M")
                else:
                    if platform.system() == "Windows":
                        time_format = "%#I:%M %p"
                    else:
                        time_format = "%-I:%M %p"
                    return dt.strftime(time_format)
            
            # Handle hour-only format (e.g., "14", "2")
            else:
                try:
                    hour = int(normalized)
                    if 1 <= hour <= 12:
                        # Assume 12-hour format, default to AM
                        if hour == 12:
                            hour = 0
                        dt = datetime.datetime(2000, 1, 1, hour, 0)
                    elif 0 <= hour <= 23:
                        # 24-hour format
                        dt = datetime.datetime(2000, 1, 1, hour, 0)
                    else:
                        raise ValueError(f"Invalid hour: {hour}")
                    
                    if to_24h:
                        return dt.strftime("%H:%M")
                    else:
                        if platform.system() == "Windows":
                            time_format = "%#I:%M %p"
                        else:
                            time_format = "%-I:%M %p"
                        return dt.strftime(time_format)
                except ValueError:
                    pass
            
            # If we reach here, we couldn't parse the time
            raise ValueError(f"Could not parse time format: '{time_str}' (normalized: '{normalized}')")
            
        except Exception as manual_error:
            logging.error(f"Manual time parsing failed for '{time_str}': {manual_error}")
            raise ValueError(f"Could not parse time '{time_str}': {manual_error}")

def normalize_time_format(time_str, to_24h=True):
    """
    Convert a time string from one format to another.
    
    Parameters:
        time_str (str): A time string in either 12-hour (h:MM AM/PM) or 24-hour (HH:MM) format
        to_24h (bool): If True, converts to 24-hour format, otherwise to 12-hour format
    
    Returns:
        str: The time string in the requested format
        
    Raises:
        ValueError: If the time string cannot be parsed
    """
    try:
        # Try to determine if input is already in 24-hour format
        is_24h_format = ":" in time_str and " " not in time_str
        
        if is_24h_format:
            # Input is already in 24h format (HH:MM)
            if to_24h:
                # Validate the format by trying to parse it
                try:
                    hour, minute = map(int, time_str.split(':'))
                    if not (0 <= hour <= 23) or not (0 <= minute <= 59):
                        raise ValueError(f"Invalid time components: {hour}:{minute}")
                    return time_str  # Already in 24h format
                except ValueError as e:
                    raise ValueError(f"Invalid 24-hour time format '{time_str}': {e}")
            else:
                # Convert from 24h to 12h
                try:
                    hour, minute = map(int, time_str.split(':'))
                    dt = datetime.datetime(2000, 1, 1, hour, minute)
                    
                    # Format based on operating system
                    if platform.system() == "Windows":
                        time_format = "%#I:%M %p"
                    else:
                        time_format = "%-I:%M %p"
                    return dt.strftime(time_format)
                except ValueError as e:
                    raise ValueError(f"Invalid 24-hour time format '{time_str}': {e}")
        else:
            # Input is probably in 12h format with AM/PM
            if not to_24h:
                # Validate the format by trying to parse it
                try:
                    parse_time(time_str, to_24h=True)  # Just to validate
                    return time_str  # Return original if valid
                except ValueError as e:
                    raise ValueError(f"Invalid 12-hour time format '{time_str}': {e}")
            else:
                # Convert from 12h to 24h
                return parse_time(time_str, to_24h=True)
    
    except Exception as e:
        logging.error(f"Error normalizing time format: {e}")
        raise ValueError(f"Could not normalize time format '{time_str}': {e}")

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

def format_enhanced_vacation_message(start_date, end_date, base_message=""):
    """
    Create a comprehensive vacation message with day names and dates in both Hijri and Gregorian calendars.
    
    Parameters:
        start_date (datetime): Start date of vacation
        end_date (datetime): End date of vacation  
        base_message (str): Base vacation message from config
        
    Returns:
        str: Formatted vacation message with both calendar systems and day names
    """
    # Get day names in English
    start_day_name = start_date.strftime('%A')
    end_day_name = end_date.strftime('%A')
    
    # Convert to Hijri dates
    start_hijri = convert.Gregorian(start_date.year, start_date.month, start_date.day).to_hijri()
    end_hijri = convert.Gregorian(end_date.year, end_date.month, end_date.day).to_hijri()
    
    # Format dates in both calendars
    start_gregorian = start_date.strftime('%Y-%m-%d')
    end_gregorian = end_date.strftime('%Y-%m-%d')
    start_hijri_str = f"{start_hijri.year}-{start_hijri.month:02d}-{start_hijri.day:02d}"
    end_hijri_str = f"{end_hijri.year}-{end_hijri.month:02d}-{end_hijri.day:02d}"
    
    # Create vacation message with English names and both calendar dates
    message = f"""🏖️:
• {start_day_name} {start_gregorian} ({start_hijri_str} Hijri)
To:
• {end_day_name} {end_gregorian} ({end_hijri_str} Hijri)

{base_message}"""
    
    return message

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
                start_date = datetime.datetime.strptime(start_day, "%Y-%m-%d").replace(tzinfo=ZoneInfo(config['TIMEZONE']))
                # Fix: Treat duration as inclusive days count
                # For 20 days starting May 31: May 31 + 19 days = June 19 (20th day inclusive)
                end_date = start_date + datetime.timedelta(days=duration-1)
                if start_date.date() <= date_obj <= end_date.date():
                    # Get base vacation message
                    vacation_msg = config.get('VACATION_MESSAGE', 'The business is closed during this period.')
                    
                    # Create comprehensive vacation message with both calendars and day names
                    message = format_enhanced_vacation_message(start_date, end_date, vacation_msg)
                    
                    return True, message
            except (ValueError, TypeError) as e:
                logging.error(f"Error checking vacation period for date {start_day}: {e}")
                # Continue checking other dates if one fails
        
        return False, None
    except Exception as e:
        logging.error(f"Error in is_vacation_period: {e}")
        return False, None

def find_vacation_end_date(date_obj, vacation_dict=None):
    """
    Find the end date of the vacation period if the given date falls within one.
    
    Parameters:
        date_obj (datetime.date): The date to check
        vacation_dict (dict, optional): Dictionary of vacation periods with start dates and durations
        
    Returns:
        datetime.date or None: The end date of the vacation period if date_obj is within one, otherwise None
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
        
        # Check if the date falls within any vacation period and return the end date
        for start_day, duration in vacation_dict.items():
            try:
                start_date = datetime.datetime.strptime(start_day, "%Y-%m-%d").replace(tzinfo=ZoneInfo(config['TIMEZONE']))
                end_date = start_date + datetime.timedelta(days=duration-1)
                if start_date.date() <= date_obj <= end_date.date():
                    return end_date.date()
            except (ValueError, TypeError) as e:
                logging.error(f"Error checking vacation period for date {start_day}: {e}")
                # Continue checking other dates if one fails
        
        return None
    except Exception as e:
        logging.error(f"Error in find_vacation_end_date: {e}")
        return None

def get_time_slots(date_str=None, check_vacation=True, to_24h=False, interval=2, schedule=None):
    """
    Comprehensive function to get time slots for a specific date with all business rules applied.
    
    Parameters:
        date_str (str, optional): Gregorian iso-format date string to get time slots for.
                                  If provided, this will be converted to a date_obj
        check_vacation (bool): Whether to check if the date is during a vacation period (default: True)
        to_24h (bool): Whether to return time slots in 24-hour format (default: False)
        interval (int): Hour interval between time slots (default: 2)
        schedule (dict, optional): Dictionary defining working schedules for weekdays
                                  Format: {weekday: [start_hour, end_hour] or None}
                                  Keys are weekdays (0=Monday, 6=Sunday)
                                  Values are either None (non-working day) or [start_hour, end_hour]
                                  If None, defaults to clinic's regular schedule
        
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
        now = datetime.datetime.now(tz=ZoneInfo(config['TIMEZONE']))
        
        # Convert date_str to date_obj if date_str is provided
        if date_str is not None:
            # First validate the date using is_valid_date_time
            is_valid, error_message, parsed_date_str, _ = is_valid_date_time(date_str)
            if not is_valid:
                return format_response(False, message=error_message)
                
            date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
        else:
            date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
            # Ensure the provided date_obj is not in the past
            if date_obj < now.date():
                return format_response(False, message=get_message("past_date_error"))
            
        # Check if the date falls within a vacation period
        if check_vacation:
            is_vacation, vacation_message = is_vacation_period(date_obj)
            if is_vacation:
                return format_response(False, message=vacation_message)
        
        # Get day of week (0=Monday, 6=Sunday)
        day_of_week = date_obj.weekday()
        
        # Set default schedule if not provided
        if schedule is None:
            schedule = {
                0: [11, 17],  # Monday: 11 AM to 5 PM
                1: [11, 17],  # Tuesday: 11 AM to 5 PM
                2: [11, 17],  # Wednesday: 11 AM to 5 PM
                3: [11, 17],  # Thursday: 11 AM to 5 PM
                4: None,      # Friday: Non-working day
                5: [16, 21],  # Saturday: 4 PM to 9 PM
                6: [11, 17]   # Sunday: 11 AM to 5 PM
            }
        
        # Check if the day is a non-working day
        if schedule.get(day_of_week) is None:
            return format_response(False, message=get_message("non_working_day"))
        
        # Check if the date falls within Ramadan
        hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
        is_ramadan = hijri_date.month == 9
        
        # Define time slots in 12-hour format based on day and Ramadan status
        if is_ramadan:
            # Ramadan hours override regular schedule
            available_12h = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(10, 15, interval)}
        else:
            # Use the configured schedule for this day
            day_schedule = schedule.get(day_of_week, [11, 17])
            start_hour, end_hour = day_schedule
            available_12h = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(start_hour, end_hour, interval)}
        
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
        # System error fallback
        return format_response(False, message=get_message("system_error_generic", error=str(e)))

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
            return False, format_response(False, message=get_message("invalid_reservation_type", ar)), None
            
        return True, None, parsed_type
    except (ValueError, TypeError):
        return False, format_response(False, message=get_message("invalid_reservation_type", ar)), None

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
        current_time = datetime.datetime.now(tz=ZoneInfo(config['TIMEZONE'])).time()
    
    # Filter out past time slots
    filtered_slots = {}
    for time_slot, count in time_slots_dict.items():
        try:
            # Use our robust parse_time function to handle various formats
            parsed_time_24h = parse_time(time_slot, to_24h=True)
            time_obj = datetime.datetime.strptime(parsed_time_24h, "%H:%M").time()
            
            if time_obj > current_time:
                filtered_slots[time_slot] = count
        except (ValueError, Exception) as e:
            # If we can't parse the time, log error but keep the slot to be safe
            logging.error(f"Could not parse time slot '{time_slot}' in filter_past_time_slots: {e}")
            filtered_slots[time_slot] = count
    
    return filtered_slots

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
        now = datetime.datetime.now(tz=ZoneInfo(config['TIMEZONE']))
        today = now.date()
        
        # Default value for parsed_time
        parsed_time_str = None
        
        # Check if the date is in the past
        if date_obj < today:
            return False, get_message("cannot_reserve_past"), parsed_date_str, parsed_time_str
        
        # If time string is provided, check if it's valid for today
        if time_str:
            try:
                parsed_time_str = parse_time(time_str, to_24h=True)
            except ValueError as time_error:
                return False, get_message("invalid_time_format", error=str(time_error)), parsed_date_str, None
            
            if date_obj == today:
                # Convert time to datetime objects for comparison
                time_obj = datetime.datetime.strptime(parsed_time_str, "%H:%M").time()
                current_time = now.time()
                
                if time_obj <= current_time:
                    return False, get_message("cannot_reserve_past"), parsed_date_str, parsed_time_str
        
        return True, None, parsed_date_str, parsed_time_str
    
    except Exception as e:
        return False, get_message("invalid_date_format", error=str(e)), None, None

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
        except Exception:
            return format_response(False, message=get_message("invalid_date", ar))

    # Parse time if provided
    parsed_time = None
    if time_slot:
        try:
            parsed_time = normalize_time_format(time_slot, to_24h=True)
        except Exception:
            return format_response(False, message=get_message("invalid_time", ar))

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

    # Standardized response message
    if removed:
        key = "reservation_cancelled" if parsed_date and parsed_time else "all_reservations_cancelled"
    else:
        key = "system_error_contact_secretary"
    return format_response(removed, message=get_message(key, ar))

def delete_user(wa_id):
    """
    Hard delete user(s) from the database, and all their data.
    """
    # Validate WhatsApp ID
    is_valid = is_valid_number(wa_id)
    if is_valid is not True:
        return is_valid

    # Perform deletion
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
    cursor.execute("DELETE FROM conversation WHERE wa_id = ?", (wa_id,))
    cursor.execute("DELETE FROM customers WHERE wa_id = ?", (wa_id,))
    conn.commit()
    conn.close()
    return format_response(True, message=get_message("user_deleted"))
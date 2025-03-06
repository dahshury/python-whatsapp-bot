import json
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import config
from app.db import get_connection
from app.utils import (make_thread, parse_date, parse_time,
                       send_whatsapp_location, find_nearest_time_slot)
from hijri_converter import convert

def send_business_location(wa_id, json_dump=False):
    try:
        status = send_whatsapp_location(wa_id, config["BUSINESS_LATITUDE"], config["BUSINESS_LONGITUDE"], config['BUSINESS_NAME'], config['BUSINESS_ADDRESS'])
        result = {"success": False, "message": "System error occurred. try again later."} if status.get("status") == "error" else {"success": True, "message": "Location sent."}
        return json.dumps(result) if json_dump else result
    except Exception as e:
        result = {"success": False, "message": "System error occurred. try again later."}
        logging.error(f"Function call send_business_location failed, error: {e}")
        return json.dumps(result) if json_dump else result

def get_current_datetime(json_dump=False):
    """
    Get the current date and time in both Hijri and Gregorian calendars.
    Returns a JSON/dict with:
      - "gregorian_date" (YYYY-MM-DD)
      - "makkah_time" (HH:MM)
      - "hijri_date" (YYYY-MM-DD)
      - "day_name" (abbreviated weekday)
    """
    try:
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        gregorian_date_str = now.strftime("%Y-%m-%d")
        gregorian_time_str = now.strftime("%H:%M")
        
        hijri_date = convert.Gregorian(now.year, now.month, now.day).to_hijri()
        hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
        
        day_name = now.strftime("%a")
        
        result = {
            "gregorian_date": gregorian_date_str,
            "makkah_time": gregorian_time_str,
            "hijri_date": hijri_date_str,
            "day_name": day_name
        }
        return json.dumps(result) if json_dump else result
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_current_datetime failed, error: {e}")
        return json.dumps(result) if json_dump else result
        
def get_all_reservations(future=True, cancelled_only=False, json_dump=False):
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

        return json.dumps(reservations) if json_dump else reservations

    except Exception as e:
        logging.error(f"Function call get_all_reservations failed, error: {e}")
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        return json.dumps(result) if json_dump else result

def get_all_conversations(wa_id=None, json_dump=False):
    """
    Get all conversations for a specific user (wa_id) from the database. If no wa_id is provided, all conversations in the database are returned.
    Group them by wa_id, then sort by date and time.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Filtering by wa_id if provided
        if wa_id:
            query = """
                SELECT wa_id, role, message, date, time 
                FROM conversation 
                WHERE wa_id = %s 
                ORDER BY date ASC, time ASC
            """
            cursor.execute(query, (wa_id,))
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

        return json.dumps(conversations) if json_dump else conversations

    except Exception as e:
        logging.error(f"Function call get_all_conversations failed, error: {e}")
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        return json.dumps(result) if json_dump else result
    
def modify_id(old_wa_id, new_wa_id):
    """
    Modify the WhatsApp ID (wa_id) for a customer in all related tables.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check if the new wa_id already exists
        cursor.execute("SELECT COUNT(*) FROM threads WHERE wa_id = ?", (new_wa_id,))
        if cursor.fetchone()[0] > 0:
            conn.close()
            result = {"success": False, "message": "The new wa_id already exists."}
            return result
        
        # Update the wa_id in the threads table
        cursor.execute("UPDATE threads SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
        
        # Update the wa_id in the conversation table
        cursor.execute("UPDATE conversation SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
        
        # Update the wa_id in the reservations table
        cursor.execute("UPDATE reservations SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
        
        # Update the wa_id in the cancelled_reservations table
        cursor.execute("UPDATE cancelled_reservations SET wa_id = ? WHERE wa_id = ?", (new_wa_id, old_wa_id))
        
        conn.commit()
        conn.close()
        
        result = {"success": True, "message": "wa_id modified successfully."}
        return result
    
    except Exception as e:
        logging.error(f"Function call modify_id failed, error: {e}")
        result = {"success": False, "message": "System error occurred"}
        return result

def modify_reservation(wa_id, new_date, new_time_slot, new_name, new_type, approximate=False, json_dump=False):
    """
    Modify the reservation for an existing customer.

    Parameters:
        wa_id: WhatsApp ID
        new_date: New date for the reservation
        new_time_slot: New time slot (expected format: "%I:%M %p", e.g., "11:00 AM")
        new_name: New customer name
        new_type: Reservation type (0 or 1)
        approximate: If True, reserves the nearest available slot if the requested slot is not available.
        json_dump: If True, returns the result as a JSON string.
    """
    new_date = parse_date(new_date)
    new_time_slot = parse_time(new_time_slot)
    try:
        # Get available time slots for the given date.
        available = get_time_slots(new_date)
        
        # If the requested time slot is not in the available slots.
        if new_time_slot not in available:
            if approximate:
                # Find the nearest available time slot.
                nearest_slot = find_nearest_time_slot(new_time_slot, available.keys())
                if nearest_slot is None:
                    result = {"success": False, "message": "No available time slot found for approximation."}
                    return json.dumps(result) if json_dump else result
                new_time_slot = nearest_slot
            else:
                result = {"success": False, "message": "Reservation modification failed. Invalid time slot."}
                return json.dumps(result) if json_dump else result

        # Recompute the datetime string with the (possibly adjusted) time slot.
        new_datetime_str = f"{new_date} {new_time_slot}"
        new_datetime_obj = datetime.strptime(new_datetime_str, "%Y-%m-%d %I:%M %p").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))

        if new_datetime_obj < now:
            result = {"success": False, "message": "Cannot reserve a time slot in the past."}
            return json.dumps(result) if json_dump else result

        if not new_name:
            result = {"success": False, "message": "Reservation modification failed. Empty customer name."}
            return json.dumps(result) if json_dump else result

        if not new_time_slot:
            result = {"success": False, "message": "Reservation modification failed. Empty time slot."}
            return json.dumps(result) if json_dump else result

        if new_type not in (0, 1):
            result = {"success": False, "message": "Reservation modification failed. Invalid type (must be 0 or 1)."}
            return json.dumps(result) if json_dump else result

        conn = get_connection()
        cursor = conn.cursor()

        # Check if the reservation exists.
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ?", (wa_id,))
        if cursor.fetchone()[0] == 0:
            conn.close()
            result = {"success": False, "message": "Reservation not found."}
            return json.dumps(result) if json_dump else result

        # Update the reservation with the new details.
        cursor.execute(
            "UPDATE reservations SET date = ?, time_slot = ?, customer_name = ?, type = ? WHERE wa_id = ?",
            (new_date, new_time_slot, new_name, new_type, wa_id)
        )

        conn.commit()
        conn.close()

        result = {"success": True, "new_time_slot": new_time_slot}
        return json.dumps(result) if json_dump else result

    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call modify_reservation failed, error: {e}")
        return json.dumps(result) if json_dump else result

def get_customer_reservations(wa_id, json_dump=False):
    """
    Get the list of future reservations for the given WhatsApp ID.
    """
    try:
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT date, time_slot, customer_name, type FROM reservations WHERE wa_id = ? AND date || ' ' || time_slot >= ?",
            (wa_id, now.strftime("%Y-%m-%d %H:%M"))
        )
        rows = cursor.fetchall()
        conn.close()
        reservation_list = [dict(row) for row in rows]
        return json.dumps(reservation_list) if json_dump else reservation_list
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_customer_reservations failed, error: {e}")
        return json.dumps(result) if json_dump else result

def get_time_slots(date_str, json_dump=False, hijri=False, vacation=None):
    """
    Get all the time slots for a given date.
    """
    try:
        date_str = parse_date(date_str, hijri=hijri)
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
        # Compare only the date parts
        if date_obj.date() < now.date():
            result = {"success": False, "message": "Cannot check time slots for a past date."}
            return json.dumps(result) if json_dump else result

        day_of_week = date_obj.weekday()

        # Check if the date falls within Ramadan
        hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
        is_ramadan = hijri_date.month == 9
        if day_of_week == 4:  # Friday
            available = {}  # Clinic is closed on Fridays
        elif is_ramadan:
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(10, 15, 2)}  # 10 AM to 4 PM during Ramadan
        elif day_of_week == 5:  # Saturday
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(17, 21, 2)}  # 5 PM to 10 PM
        else:  # Sunday to Thursday
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(11, 17, 2)}  # 11 AM to 5 PM
        if date_obj.date() == now.date():
            available = {time: count for time, count in available.items() if datetime.strptime(time, "%I:%M %p").time() > now.time()}

        # Check if the date falls within the vacation period
        if vacation:
            for start_day, duration in vacation.items():
                start_date = datetime.strptime(start_day, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
                end_date = start_date + timedelta(days=duration)
                if start_date.date() <= date_obj.date() <= end_date.date():
                    result = {"success": False, "message": "Doctor is on vacation."}
                    return json.dumps(result) if json_dump else result

        return json.dumps(available) if json_dump else available
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_time_slots failed, error: {e}")
        return json.dumps(result) if json_dump else result

def reserve_time_slot(wa_id, customer_name, date_str, time_slot, reservation_type, hijri=False, json_dump=False, max_reservations=5):
    """
    Reserve a time slot for a customer. Handles even non-ISO-like formats by converting
    the input date (Hijri or Gregorian) into a standardized ISO (YYYY-MM-DD) format.
    
    Parameters:
      - wa_id: WhatsApp ID (12 digits)
      - customer_name: Customer's name
      - date_str: Date string (can be Hijri or Gregorian)
      - time_slot: Desired time slot
      - reservation_type: Type of reservation (0 or 1)
      - hijri: Boolean indicating if the input date is Hijri (default: False)
      - json_dump: If True, returns the result as a JSON string (default: False)
      - max_reservations: Maximum allowed reservations per time slot on a day (default: 5)
    """
    if len(str(wa_id)) != 12:
        result = {"success": False, "message": "Invalid phone number. Please make sure to use 96659 at the start."}
        return json.dumps(result) if json_dump else result

    if not customer_name:
        result = {"success": False, "message": "Customer name has to be provided."}
        return json.dumps(result) if json_dump else result

    if reservation_type not in (0, 1):
        result = {"success": False, "message": "Invalid reservation type. Must be 0 or 1."}
        return json.dumps(result) if json_dump else result

    try:
        # Normalize and convert date and time.
        date_str = parse_date(date_str)
        time_slot = parse_time(time_slot)
        gregorian_date_str = parse_date(date_str, hijri=hijri)
        
        # Convert Gregorian to Hijri for output purposes.
        hijri_date_obj = convert.Gregorian(*map(int, gregorian_date_str.split('-'))).to_hijri()
        hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"

        # Check if the reservation date is in the past.
        reservation_date = datetime.strptime(gregorian_date_str, "%Y-%m-%d").date()
        today = datetime.now(tz=ZoneInfo("Asia/Riyadh")).date()
        if reservation_date < today:
            result = {"success": False, "message": "Cannot reserve a time slot in the past."}
            return json.dumps(result) if json_dump else result

        # Validate the available time slots for the date.
        available = get_time_slots(gregorian_date_str)
        if isinstance(available, dict) and "success" in available and not available["success"]:
            return json.dumps(available) if json_dump else available

        if time_slot not in available:
            result = {"success": False, "message": "Invalid time slot."}
            return json.dumps(result) if json_dump else result

        conn = get_connection()
        cursor = conn.cursor()

        # Check if the user already has a reservation for the given date.
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ? AND date = ?", (wa_id, gregorian_date_str))
        if cursor.fetchone()[0] > 0:
            conn.close()
            result = {"success": False, "message": "You already have a reservation for this date. Please cancel it first."}
            return json.dumps(result) if json_dump else result

        # Check if the desired time slot has reached the maximum reservations.
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ?", (gregorian_date_str, time_slot))
        if cursor.fetchone()[0] >= max_reservations:
            conn.close()
            result = {"success": False, "message": "This time slot is fully booked. Please choose another slot."}
            return json.dumps(result) if json_dump else result

        # Ensure a thread record exists.
        make_thread(wa_id)
        
        # Insert the new reservation (storing the Gregorian date for consistency).
        cursor.execute(
            "INSERT INTO reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
            (wa_id, customer_name, gregorian_date_str, time_slot, reservation_type)
        )

        conn.commit()
        conn.close()

        result = {
            "success": True,
            "gregorian_date": gregorian_date_str,
            "hijri_date": hijri_date_str,
            "time_slot": time_slot,
            "type": reservation_type,
            "message": "Reservation successful."
        }
        return json.dumps(result) if json_dump else result

    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call reserve_time_slot failed, error: {e}")
        return json.dumps(result) if json_dump else result

def delete_reservation(wa_id, date_str=None, time_slot=None, json_dump=False):
    """
    Delete a reservation for a customer.
    If date_str and time_slot are not provided, delete all reservations for the customer.
    """
    try:
        date_str=parse_date(date_str) if date_str else None
        time_slot = parse_time(time_slot) if time_slot else None
        conn = get_connection()
        cursor = conn.cursor()
        
        # If either date_str or time_slot is missing, cancel all reservations for this customer.
        if date_str is None or time_slot is None:
            cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ?", (wa_id,))
            count = cursor.fetchone()[0]
            if count == 0:
                conn.close()
                result = {
                    "success": False,
                    "message": "No reservations found for the customer."
                }
                return json.dumps(result) if json_dump else result
            
            cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
            removed = cursor.rowcount > 0
            conn.commit()
            conn.close()
            result = {
                "success": True,
                "message": "All reservations removed." if removed else "Error occurred while removing reservations."
            }
            return json.dumps(result) if json_dump else result
        
        # Otherwise, cancel the specified reservation.
        else:
            cursor.execute(
                "SELECT COUNT(*) FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
                (wa_id, date_str, time_slot)
            )
            exists = cursor.fetchone()[0] > 0
            if not exists:
                conn.close()
                result = {
                    "success": False,
                    "message": "Reservation not found."
                }
                return json.dumps(result) if json_dump else result

            cursor.execute(
                "DELETE FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
                (wa_id, date_str, time_slot)
            )
            removed = cursor.rowcount > 0
            conn.commit()
            conn.close()
            result = {
                "success": True,
                "message": "Reservation removed." if removed else "Error occurred while removing the reservation."
            }
            return json.dumps(result) if json_dump else result

    except Exception as e:
        result = {
            "success": False,
            "message": "System error occurred."
        }
        logging.error(f"Function call delete_reservation failed, error: {e}")
        return json.dumps(result) if json_dump else result
    
def cancel_reservation(wa_id, date_str=None, time_slot=None, json_dump=False):
    """
    Cancel a reservation for a customer.
    If date_str and time_slot are not provided, cancel all reservations for the customer.
    This performs a soft delete by moving the reservations to a 'cancelled_reservations' table.
    """
    try:
        date_str = parse_date(date_str) if date_str else None
        time_slot = parse_time(time_slot) if time_slot else None
        conn = get_connection()
        cursor = conn.cursor()
        
        # If either date_str or time_slot is missing, cancel all reservations for this customer.
        if date_str is None or time_slot is None:
            cursor.execute("SELECT * FROM reservations WHERE wa_id = ?", (wa_id,))
            rows = cursor.fetchall()
            if not rows:
                conn.close()
                result = {
                    "success": False,
                    "message": "No reservations found for the customer."
                }
                return json.dumps(result) if json_dump else result
            
            cursor.executemany(
                "INSERT INTO cancelled_reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
                [(row["wa_id"], row["customer_name"], row["date"], row["time_slot"], row["type"]) for row in rows]
            )
            cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
            conn.commit()
            conn.close()
            result = {
                "success": True,
                "message": "All reservations cancelled."
            }
            return json.dumps(result) if json_dump else result
        
        # Otherwise, cancel the specified reservation.
        else:
            cursor.execute(
                "SELECT * FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
                (wa_id, date_str, time_slot)
            )
            row = cursor.fetchone()
            if not row:
                conn.close()
                result = {
                    "success": False,
                    "message": "Reservation not found."
                }
                return json.dumps(result) if json_dump else result

            cursor.execute(
                "INSERT INTO cancelled_reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
                (row["wa_id"], row["customer_name"], row["date"], row["time_slot"], row["type"])
            )
            cursor.execute(
                "DELETE FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
                (wa_id, date_str, time_slot)
            )
            conn.commit()
            conn.close()
            result = {
                "success": True,
                "message": "Reservation cancelled."
            }
            return json.dumps(result) if json_dump else result

    except Exception as e:
        result = {
            "exists": False,
            "removed": False,
            "message": "System error occurred."
        }
        logging.error(f"Function call cancel_reservation failed, error: {e}")
        return json.dumps(result) if json_dump else result

def get_available_time_slots(date_str, max_reservations=5, hijri=False, json_dump=False):
    """
    Get the available time slots for a given date.
    Parses the incoming date string to ensure a valid format.
    """
    date_str = parse_date(date_str, hijri)
    try:
            
        all = get_time_slots(date_str)
        # If get_time_slots returns an error, pass it through
        if isinstance(all, dict) and "success" in all and not all["success"]:
            return json.dumps(all) if json_dump else all

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT time_slot, COUNT(*) as count FROM reservations WHERE date = ? GROUP BY time_slot",
            (date_str,)
        )
        rows = cursor.fetchall()
        conn.close()
        
        if rows:
            reservation_counts = {row["time_slot"]: row["count"] for row in rows if row["time_slot"] in all}
            # Merge counts with available slots
            for time_slot in all.keys():
                if time_slot in reservation_counts:
                    all[time_slot] += reservation_counts[time_slot]
        result = [ts for ts, count in all.items() if count < max_reservations]
        return json.dumps(result) if json_dump else result
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_available_time_slots failed, error: {e}")
        return json.dumps(result) if json_dump else result

def get_available_nearby_dates_for_time_slot(time_slot, days_forward=7, days_backward=0, max_reservations=5, hijri=False, json_dump=False):
    """
    Get the available nearby dates for a given time slot or the nearest available slot.
    Returns a list of dictionaries with date, time_slot, and whether it's an exact match.
    
    Parameters:
    - time_slot (str): Requested time (e.g., "11:00 AM", "14:00", "11:00").
    - days_forward (int): Number of days to look forward (default: 7).
    - days_backward (int): Number of days to look backward (default: 0).
    - max_reservations (int): Maximum reservations per slot (default: 5).
    - hijri (bool): Return dates in Hijri format if True (default: False).
    - json_dump (bool): Return JSON string if True, else list (default: False).
    
    Returns:
    - List of dicts or JSON string: [{"date": str, "time_slot": str, "is_exact": bool}, ...]
    """
    try:
        # Parse the requested time slot
        requested_time = parse_time(time_slot)
        requested_minutes = requested_time.hour * 60 + requested_time.minute
        
        available_dates = []
        # Get current date/time in Asia/Riyadh timezone
        today = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        conn = get_connection()
        cursor = conn.cursor()

        # Include today in the search
        date_range = list(range(-days_backward, days_forward + 1))
        
        for day_offset in date_range:
            date_obj = today + timedelta(days=day_offset)
            date_str = date_obj.strftime("%Y-%m-%d")
            
            # Get available slots for this date (assumed to be a dict of time slots)
            all_slots = get_time_slots(date_str)
            
            # Skip if get_time_slots fails or returns an empty/non-dict result
            if not isinstance(all_slots, dict) or not all_slots:
                continue
                
            # Parse all available slots
            parsed_slots = []
            for slot in all_slots.keys():
                try:
                    parsed_slot = parse_time(slot)
                    parsed_slots.append((slot, parsed_slot))
                except ValueError:
                    continue  # Skip invalid slots
            
            if not parsed_slots:
                continue
            
            # Find the closest slot based on time difference in minutes
            closest_slot, closest_time = min(
                parsed_slots,
                key=lambda x: abs((x[1].hour * 60 + x[1].minute) - requested_minutes)
            )
            
            # Determine if this is an exact match
            is_exact = (closest_time == requested_time)
            
            # Check reservation count for the closest slot
            cursor.execute(
                "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND time_slot = ?",
                (date_str, closest_slot)
            )
            row = cursor.fetchone()
            count = row["count"] if row else 0
            
            # Add date if the slot has availability
            if count < max_reservations:
                available_dates.append({
                    "date": date_str,
                    "time_slot": closest_slot,
                    "is_exact": is_exact
                })
        
        conn.close()
        
        # Convert to Hijri format if requested
        if hijri:
            for entry in available_dates:
                date_obj = datetime.strptime(entry["date"], "%Y-%m-%d")
                hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
                entry["date"] = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
        
        # Return as JSON string or list
        return json.dumps(available_dates) if json_dump else available_dates
    
    except ValueError as ve:
        result = {"success": False, "message": f"Invalid time format: {str(ve)}"}
        return json.dumps(result) if json_dump else result
    except Exception as e:
        result = {"success": False, "message": f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_available_nearby_dates_for_time_slot failed, error: {e}")
        return json.dumps(result) if json_dump else result

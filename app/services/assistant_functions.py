import json
import logging
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.config import config
from app.db import get_connection
from app.utils import (make_thread, parse_date, parse_time,
                       send_whatsapp_location, find_nearest_time_slot)
from hijri_converter import convert

def send_business_location(wa_id):
    """
    Sends the business WhatsApp location message using the WhatsApp API.
    This function sends the clinic's location to the specified WhatsApp contact.
    
    Parameters:
        wa_id (str): WhatsApp ID to send the location to
        
    Returns:
        dict: Result of the operation with success status and message
    """
    try:
        status = send_whatsapp_location(wa_id, config["BUSINESS_LATITUDE"], config["BUSINESS_LONGITUDE"], config['BUSINESS_NAME'], config['BUSINESS_ADDRESS'])
        result = {"success": False, "message": "System error occurred. try again later."} if status.get("status") == "error" else {"success": True, "message": "Location sent."}
        return result
    except Exception as e:
        result = {"success": False, "message": "System error occurred. try again later."}
        logging.error(f"Function call send_business_location failed, error: {e}")
        return result

def get_current_datetime():
    """
    Get the current date and time in both Hijri and Gregorian calendars.
    Returns a dict with:
      - "gregorian_date" (YYYY-MM-DD)
      - "makkah_time" (HH:MM)
      - "hijri_date" (YYYY-MM-DD)
      - "day_name" (abbreviated weekday)
      - "is_ramadan" (boolean)
    """
    try:
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        gregorian_date_str = now.strftime("%Y-%m-%d")
        gregorian_time_str = now.strftime("%H:%M")
        
        hijri_date = convert.Gregorian(now.year, now.month, now.day).to_hijri()
        hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
        
        day_name = now.strftime("%a")
        is_ramadan = hijri_date.month == 9
        
        result = {
            "gregorian_date": gregorian_date_str,
            "makkah_time": gregorian_time_str,
            "hijri_date": hijri_date_str,
            "day_name": day_name,
            "is_ramadan": is_ramadan
        }
        return result
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_current_datetime failed, error: {e}")
        return result
        
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
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
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
    
def modify_id(old_wa_id, new_wa_id, ar=False):
    """
    Modify the WhatsApp ID (wa_id) for a customer in all related tables.
    """
    try:
        # Check if the new wa_id is valid
        if len(str(new_wa_id)) != 12:
            message = "The new wa_id must be 12 digits long."
            if ar:
                message = "يجب أن يكون رقم الواتساب الجديد مكونًا من 12 رقمًا."
            result = {"success": False, "message": message}
            return result
        
        if not str(new_wa_id).isdigit():
            message = "The new wa_id must be an integer."
            if ar:
                message = "يجب أن يكون رقم الواتساب الجديد مكون من أرقام."
            result = {"success": False, "message": message}
            return result
        
        if old_wa_id == new_wa_id:
            message = "The new wa_id is the same as the old wa_id."
            if ar:
                message = "رقم الواتساب الجديد هو نفسه رقم الواتساب القديم."
            result = {"success": True, "message": message}
            return result

        conn = get_connection()
        cursor = conn.cursor()
        
        # Check if the new wa_id already exists
        cursor.execute("SELECT COUNT(*) FROM threads WHERE wa_id = ?", (new_wa_id,))
        if cursor.fetchone()[0] > 0:
            conn.close()
            message = "The new wa_id already exists."
            if ar:
                message = "رقم الواتساب الجديد موجود بالفعل."
            result = {"success": False, "message": message}
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
        
        message = "wa_id modified successfully."
        if ar:
            message = "تم تعديل رقم الواتساب بنجاح."
        result = {"success": True, "message": message}
        return result
    
    except Exception as e:
        logging.error(f"Function call modify_id failed, error: {e}")
        message = "System error occurred"
        if ar:
            message = "حدث خطأ في النظام"
        result = {"success": False, "message": message}
        return result

def modify_reservation(wa_id, new_date=None, new_time_slot=None, new_name=None, new_type=None, approximate=False, ar=False):
    """
    Modify the reservation for an existing customer.

    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation should be modified
        new_date (str, optional): New date for the reservation in ISO format (YYYY-MM-DD)
        new_time_slot (str, optional): New time slot (expected format: '%I:%M %p', e.g., '11:00 AM')
        new_name (str, optional): New customer name
        new_type (int, optional): Reservation type (0 for Check-Up, 1 for Follow-Up)
        approximate (bool, optional): If True, reserves the nearest available slot if the requested slot is not available
        ar (bool, optional): If True, returns error messages in Arabic
        
    Returns:
        dict: Result of the modification operation with success status and message
    """
    try:
        if new_date:
            new_date = parse_date(new_date)
        if new_time_slot:
            new_time_slot = parse_time(new_time_slot)

        # Check if at least one parameter is provided
        if not any([new_date, new_time_slot, new_name, new_type]):
            message = "No new details provided for modification."
            if ar:
                message = "لم يتم تقديم تفاصيل جديدة للتعديل."
            result = {"success": False, "message": message}
            return result

        conn = get_connection()
        cursor = conn.cursor()

        # Check if the reservation exists
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ?", (wa_id,))
        if cursor.fetchone()[0] == 0:
            conn.close()
            message = f"Reservation not found for {wa_id}."
            if ar:
                message = f"لم يتم العثور على حجز للرقم {wa_id}."
            result = {"success": False, "message": message}
            return result

        # Prepare the update query dynamically based on provided parameters
        update_fields = []
        update_values = []

        if new_date:
            update_fields.append("date = ?")
            update_values.append(new_date)
        if new_time_slot:
            available = get_time_slots(new_date)
            if new_time_slot not in available:
                if approximate:
                    nearest_slot = find_nearest_time_slot(new_time_slot, available.keys())
                    if nearest_slot is None:
                        message = "No available time slot found for approximation."
                        if ar:
                            message = "لم يتم العثور على موعد متاح للتقريب."
                        result = {"success": False, "message": message}
                        return result
                    new_time_slot = nearest_slot
                else:
                    message = "Reservation modification failed. Invalid time slot."
                    if ar:
                        message = f" {available} فشل تعديل الحجز. الوقت الذي تم اختياره ليس من ضمن."
                    result = {"success": False, "message": message}
                    return result
            update_fields.append("time_slot = ?")
            update_values.append(new_time_slot)
        if new_name:
            update_fields.append("customer_name = ?")
            update_values.append(new_name)
        if new_type is not None:
            if new_type not in (0, 1):
                message = "Reservation modification failed. Invalid type (must be 0 or 1)."
                if ar:
                    message = "فشل تعديل الحجز. نوع غير صالح (يجب أن يكون 0 أو 1)."
                result = {"success": False, "message": message}
                return result
            update_fields.append("type = ?")
            update_values.append(new_type)

        update_values.append(wa_id)
        update_query = f"UPDATE reservations SET {', '.join(update_fields)} WHERE wa_id = ?"

        cursor.execute(update_query, update_values)
        conn.commit()
        conn.close()

        result = {"success": True, "message": "Reservation modified successfully."}
        if ar:
            result["message"] = "تم تعديل الحجز بنجاح."
        return result

    except Exception as e:
        message = "System error occurred. Ask user to contact the secretary to reserve."
        if ar:
            message = "حدث خطأ في النظام. اطلب من المستخدم الاتصال بالسكرتيرة للحجز."
        result = {"success": False, "message": message}
        logging.error(f"Function call modify_reservation failed, error: {e}")
        return result

def get_customer_reservations(wa_id):
    """
    Get the list of future reservations for the given WhatsApp ID.
    Retrieves all upcoming appointments that haven't passed yet.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer to retrieve reservations for
        
    Returns:
        list: List of reservations with reservation details
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
        return reservation_list
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_customer_reservations failed, error: {e}")
        return result

def get_time_slots(date_str, hijri=False, vacation=None):
    """
    Get all the time slots for a given date.
    
    Parameters:
        date_str (str): Date string to get time slots for (can be Hijri or Gregorian)
        hijri (bool): Flag indicating if the provided date string is in Hijri format
        vacation (dict): Dictionary of vacation periods with start dates and durations
        
    Returns:
        dict: Dictionary of available time slots or error message
    """
    try:
        # Convert date to Gregorian if it's in Hijri format
        if hijri:
            hijri_date = convert.Hijri(*map(int, date_str.split('-'))).to_gregorian()
            gregorian_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
        else:
            gregorian_date_str = parse_date(date_str, hijri=hijri)
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        date_obj = datetime.strptime(gregorian_date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
        # Compare only the date parts
        if date_obj.date() < now.date():
            result = {"success": False, "message": "Cannot check time slots for a past date."}
            return result

        day_of_week = date_obj.weekday()

        # Check if the date falls within Ramadan
        hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
        is_ramadan = hijri_date.month == 9
        
        logging.info(f"Date {date_str} (Gregorian) converts to Hijri: {hijri_date.year}-{hijri_date.month}-{hijri_date.day}")
        logging.info(f"Is Ramadan: {is_ramadan}")
        
        if day_of_week == 4:  # Friday
            available = {}  # Clinic is closed on Fridays
        elif is_ramadan:
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(10, 15, 2)}  # 10 AM to 4 PM during Ramadan
            logging.info(f"Ramadan schedule applied: {available}")
        elif day_of_week == 5:  # Saturday
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(17, 22, 2)}  # 5 PM to 10 PM
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
                    return result

        return available
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_time_slots failed, error: {e}")
        return result

def reserve_time_slot(wa_id, customer_name, date_str, time_slot, reservation_type, hijri=False, max_reservations=5, ar=False):
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
      - max_reservations: Maximum allowed reservations per time slot on a day (default: 5)
      - ar: If True, returns error messages in Arabic (default: False)
    """
    if wa_id.startswith("05"):
        # Remove the '05' prefix and add '966' in its place
        wa_id = "966" + wa_id[1:]
        
    if len(str(wa_id)) != 12:
        message = "Invalid phone number. Please make sure to use 96659 at the start."
        if ar:
            message = "رقم الهاتف غير صالح. يرجى التأكد من استخدام 96659 في البداية."
        result = {"success": False, "message": message}
        return result

    if not customer_name:
        message = "Customer name has to be provided."
        if ar:
            message = "يجب تقديم اسم العميل."
        result = {"success": False, "message": message}
        return result

    if reservation_type not in (0, 1):
        message = "Invalid reservation type. Must be 0 or 1."
        if ar:
            message = "نوع الحجز غير صالح. يجب أن يكون 0 أو 1."
        result = {"success": False, "message": message}
        return result

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
            message = "Cannot reserve a time slot in the past."
            if ar:
                message = "لا يمكن حجز موعد في الماضي."
            result = {"success": False, "message": message}
            return result

        # Validate the available time slots for the date.
        available = get_time_slots(gregorian_date_str)
        if isinstance(available, dict) and "success" in available and not available["success"]:
            return available

        if time_slot not in available:
            message = "Invalid time slot."
            if ar:
                message = f" {available} فشل الحجز. الوقت الذي تم اختياره ليس من ضمن."
            result = {"success": False, "message": message}
            return result

        conn = get_connection()
        cursor = conn.cursor()

        # Check if the user already has a reservation for the given date.
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ? AND date = ?", (wa_id, gregorian_date_str))
        if cursor.fetchone()[0] > 0:
            conn.close()
            message = "You already have a reservation for this date. Please cancel it first."
            if ar:
                message = "لديك حجز بالفعل لهذا التاريخ. يرجى إلغاؤه أولاً."
            result = {"success": False, "message": message}
            return result

        # Check if the desired time slot has reached the maximum reservations.
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ?", (gregorian_date_str, time_slot))
        if cursor.fetchone()[0] >= max_reservations:
            conn.close()
            message = "This time slot is fully booked. Please choose another slot."
            if ar:
                message = "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر."
            result = {"success": False, "message": message}
            return result

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
        if ar:
            result["message"] = "تم الحجز بنجاح."
        return result

    except Exception as e:
        message = "System error occurred. Ask user to contact the secretary to reserve."
        if ar:
            message = "حدث خطأ في النظام. اطلب من المستخدم الاتصال بالسكرتيرة للحجز."
        result = {"success": False, "message": message}
        logging.error(f"Function call reserve_time_slot failed, error: {e}")
        return result

def delete_reservation(wa_id, date_str=None, time_slot=None, ar=False):
    """
    Delete a reservation for a customer.
    If date_str and time_slot are not provided, delete all reservations for the customer.
    """
    try:
        date_str = parse_date(date_str) if date_str else None
        time_slot = parse_time(time_slot) if time_slot else None
        conn = get_connection()
        cursor = conn.cursor()
        
        # If either date_str or time_slot is missing, cancel all reservations for this customer.
        if date_str is None or time_slot is None:
            cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ?", (wa_id,))
            count = cursor.fetchone()[0]
            if count == 0:
                conn.close()
                message = "No reservations found for the customer."
                if ar:
                    message = "لم يتم العثور على حجوزات للعميل."
                result = {
                    "success": False,
                    "message": message
                }
                return result
            
            cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
            removed = cursor.rowcount > 0
            conn.commit()
            conn.close()
            message = "All reservations removed." if removed else "Error occurred while removing reservations."
            if ar:
                message = "تمت إزالة جميع الحجوزات." if removed else "حدث خطأ أثناء إزالة الحجوزات."
            result = {
                "success": True,
                "message": message
            }
            return result
        
        # Otherwise, cancel the specified reservation.
        else:
            cursor.execute(
                "SELECT COUNT(*) FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
                (wa_id, date_str, time_slot)
            )
            exists = cursor.fetchone()[0] > 0
            if not exists:
                conn.close()
                message = "Reservation not found."
                if ar:
                    message = "لم يتم العثور على الحجز."
                result = {
                    "success": False,
                    "message": message
                }
                return result

            cursor.execute(
                "DELETE FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
                (wa_id, date_str, time_slot)
            )
            removed = cursor.rowcount > 0
            conn.commit()
            conn.close()
            message = "Reservation removed." if removed else "Error occurred while removing the reservation."
            if ar:
                message = "تمت إزالة الحجز." if removed else "حدث خطأ أثناء إزالة الحجز."
            result = {
                "success": True,
                "message": message
            }
            return result

    except Exception as e:
        message = "System error occurred."
        if ar:
            message = "حدث خطأ في النظام."
        result = {
            "success": False,
            "message": message
        }
        logging.error(f"Function call delete_reservation failed, error: {e}")
        return result
    
def cancel_reservation(wa_id, date_str=None, ar=False):
    """
    Cancel a reservation for a customer.
    This performs a soft delete by moving the reservations to a 'cancelled_reservations' table.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation should be cancelled.
        date_str (str, optional): Date for the reservation in ISO format (e.g., 'YYYY-MM-DD').
                                 If not provided, all reservations are cancelled.
        ar (bool): If True, returns error messages in Arabic
        
    Returns:
        dict: Result of the cancellation operation with success status and message
    """
    
    if not len(str(wa_id)) == 12:
        message = "Invalid phone number. Please make sure to use 96659 at the start."
        if ar:
            message = "رقم الهاتف غير صالح. يرجى التأكد من استخدام 96659 في البداية."
        result = {"success": False, "message": message}
        return result
    if str(wa_id).startswith("05"):
        # Remove the '05' prefix and add '966' in its place
        wa_id = "966" + wa_id[1:]
        
    try:
        date_str = parse_date(date_str) if date_str else None
        conn = get_connection()
        cursor = conn.cursor()
        
        # If date_str is missing, cancel all reservations for this customer.
        if date_str is None:
            cursor.execute("SELECT * FROM reservations WHERE wa_id = ?", (wa_id,))
            rows = cursor.fetchall()
            if not rows:
                conn.close()
                message = "No reservations found for the customer."
                if ar:
                    message = "لم يتم العثور على حجوزات للعميل."
                result = {
                    "success": False,
                    "message": message
                }
                return result
            
            cursor.executemany(
                "INSERT INTO cancelled_reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
                [(row["wa_id"], row["customer_name"], row["date"], row["time_slot"], row["type"]) for row in rows]
            )
            cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
            conn.commit()
            conn.close()
            message = "All reservations cancelled."
            if ar:
                message = "تم إلغاء جميع الحجوزات."
            result = {
                "success": True,
                "message": message
            }
            return result
        
        # Otherwise, cancel the reservations for the specified date.
        else:
            cursor.execute(
                "SELECT * FROM reservations WHERE wa_id = ? AND date = ?",
                (wa_id, date_str)
            )
            rows = cursor.fetchall()
            if not rows:
                conn.close()
                message = "Reservation not found."
                if ar:
                    message = "لم يتم العثور على الحجز."
                result = {
                    "success": False,
                    "message": message
                }
                return result

            cursor.executemany(
                "INSERT INTO cancelled_reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
                [(row["wa_id"], row["customer_name"], row["date"], row["time_slot"], row["type"]) for row in rows]
            )
            cursor.execute(
                "DELETE FROM reservations WHERE wa_id = ? AND date = ?",
                (wa_id, date_str)
            )
            conn.commit()
            conn.close()
            message = "Reservation cancelled."
            if ar:
                message = "تم إلغاء الحجز."
            result = {
                "success": True,
                "message": message
            }
            return result

    except Exception as e:
        message = "System error occurred."
        if ar:
            message = "حدث خطأ في النظام."
        result = {
            "success": False,
            "message": message
        }
        logging.error(f"Function call cancel_reservation failed, error: {e}")
        return result

def get_available_time_slots(date_str, max_reservations=5, hijri=False):
    """
    Get the available time slots for a given date.
    
    Parameters:
        date_str (str): Date string to get available time slots for.
                        If 'hijri' is true, the date string can be in various Hijri formats such as
                        '1447-09-10', '10 Muharram 1447', or '10, Muharram, 1447'.
                        Otherwise, expects Gregorian date formats like 'YYYY-MM-DD'.
        max_reservations (int): Maximum number of reservations allowed per time slot
        hijri (bool): Flag indicating if the provided date string is in Hijri format
        
    Returns:
        list: List of available time slots
    """
    date_str = parse_date(date_str, hijri)
    try:
        all = get_time_slots(date_str, hijri)
        # If get_time_slots returns an error, pass it through
        if isinstance(all, dict) and "success" in all and not all["success"]:
            return all

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
        return result
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_available_time_slots failed, error: {e}")
        return result

def get_available_nearby_dates_for_time_slot(time_slot, days_forward=7, days_backward=0, max_reservations=5, hijri=False):
    """
    Get the available nearby dates for a given time slot within a specified range of days.
    Returns a list of dictionaries with date, time_slot, and whether it's an exact match.
    
    Parameters:
        time_slot (str): The time slot to check availability for in the format '%I:%M %p', e.g., '11:00 AM'
        days_forward (int): Number of days to look forward for availability, must be a non-negative integer
        days_backward (int): Number of days to look backward for availability, must be a non-negative integer
        max_reservations (int): Maximum reservations per slot (default: 5)
        hijri (bool): Flag to indicate if the output dates should be converted to Hijri format
    
    Returns:
        list: List of dictionaries with available dates and times
              [{"date": str, "time_slot": str, "is_exact": bool}, ...]
    """
    try:
        # Parse the requested time slot
        time_str = parse_time(time_slot)
        requested_time = datetime.strptime(time_str, "%I:%M %p")
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
                    parsed_slot = datetime.strptime(parsed_slot, "%I:%M %p")
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
        
        return available_dates
    
    except ValueError as ve:
        result = {"success": False, "message": f"Invalid time format: {str(ve)}"}
        return result
    except Exception as e:
        result = {"success": False, "message": f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_available_nearby_dates_for_time_slot failed, error: {e}")
        return result

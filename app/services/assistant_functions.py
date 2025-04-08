import json
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import phonenumbers
from app.config import config
from app.db import get_connection
from app.utils import (make_thread, parse_date, parse_time,
                       send_whatsapp_location, find_nearest_time_slot, is_valid_number, fix_unicode_sequence)
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
        is_valid_wa_id = is_valid_number(wa_id)
        if not is_valid_wa_id:
            return is_valid_wa_id
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
    
def modify_id(old_wa_id, new_wa_id, ar=False):
    """
    Modify the WhatsApp ID (wa_id) for a customer in all related tables.
    """
    try:
        is_valid_wa_id = is_valid_number(new_wa_id, ar)
        if not is_valid_wa_id:
            return is_valid_wa_id
        
        if old_wa_id == new_wa_id:
            message = "The new wa_id is the same as the old wa_id."
            if ar:
                message = "رقم الواتساب الجديد هو نفسه رقم الواتساب القديم."
            result = {"success": True, "message": message}
            return result

        conn = get_connection()
        cursor = conn.cursor()
        
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
        
        if ar:
            message = "تم تعديل رقم الواتساب بنجاح."
        else:
            message = "wa_id modified successfully."
            
        result = {"success": True, "message": message}
        return result
    
    except Exception as e:
        logging.error(f"Function call modify_id failed, error: {e}")
        message = "System error occurred"
        if ar:
            message = "حدث خطأ في النظام"
        result = {"success": False, "message": message}
        return result

def modify_reservation(wa_id, new_date=None, new_time_slot=None, new_name=None, new_type=None, max_reservations=5, approximate=False, hijri=False, ar=False):
    """
    Modify the reservation for an existing customer.

    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation should be modified
        new_date (str, optional): New date for the reservation in ISO format (YYYY-MM-DD)
        new_time_slot (str, optional): New time slot (expected format: '%I:%M %p', e.g., '11:00 AM')
        new_name (str, optional): New customer name
        new_type (int, optional): Reservation type (0 for Check-Up, 1 for Follow-Up)
        approximate (bool, optional): If True, reserves the nearest available slot if the requested slot is not available
        hijri (bool, optional): If True, the provided date is in Hijri format
        ar (bool, optional): If True, returns error messages in Arabic
        
    Returns:
        dict: Result of the modification operation with success status and message
    """
    try:
        # Phone number validation
        is_valid_wa_id = is_valid_number(wa_id, ar)
        if is_valid_wa_id != True:
            return is_valid_wa_id
        
        # Check if at least one parameter is provided
        if not any([new_date, new_time_slot, new_name, new_type]):
            message = "No new details provided for modification."
            if ar:
                message = "لم يتم تقديم تفاصيل جديدة للتعديل."
            result = {"success": False, "message": message}
            return result
        
        # Get current date/time
        curr_date = datetime.now(tz=ZoneInfo("Asia/Riyadh")).strftime("%Y-%m-%d")
        curr_time = datetime.now(tz=ZoneInfo("Asia/Riyadh")).strftime("%I:%M %p")
        # Get all UPCOMING reservations for this user
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM reservations WHERE wa_id = ? AND date >= ?", 
            (wa_id, curr_date)
        )
        
        upcoming_reservations = cursor.fetchall()
        # Check if there's exactly one upcoming reservation
        if len(upcoming_reservations) == 0:
            conn.close()
            if ar:
                message = "لم يتم العثور على حجوزات قادمة للتعديل. الرجاء حجز موعد جديد."
            else:
                message = "No upcoming reservations found to modify. Please reserve a new appointment."
            result = {"success": False, "message": message}
            return result
        # If multiple upcoming reservations, return error
        if len(upcoming_reservations) > 1:
            conn.close()
            translated_reservations = [
                {key: row[key] for key in row.keys()} for row in upcoming_reservations
            ]
            message = f"Multiple upcoming reservations found: {translated_reservations}. You can only have one future reservation. Please cancel unused reservations."
            if ar:
                message = "تم العثور على حجوزات متعددة قادمة. يمكنك أن تمتلك حجز مستقبلي واحد فقط. الرجاء إلغاء الحجوزات الغير مستعملة"
            result = {"success": False, "message": message}
            return result
        # Now we have exactly one upcoming reservation to modify
        existing_reservation = upcoming_reservations[0]
        existing_date = existing_reservation["date"]
        existing_time_slot = existing_reservation["time_slot"]
        
        # Process any new date provided
        if new_date:
            check_date = parse_date(new_date)
            if check_date < curr_date:
                if ar:
                    message = "لا يمكنك الحجز في الماضي."
                else:
                    message = "You can't reserve in the past"
                result = {"success": False, "message": message}
                return result
        else:
            check_date = existing_date
        # Process any new time slot provided
        if new_time_slot:
            try:
                check_time_slot = parse_time(new_time_slot)
                available = get_time_slots(check_date)
                
                if isinstance(available, dict) and "success" in available and not available["success"]:
                    return available
                
                if check_date == curr_date:
                    new_time_obj = datetime.strptime(check_time_slot, "%I:%M %p")
                    curr_time_obj = datetime.strptime(curr_time, "%I:%M %p")
                    if new_time_obj <= curr_time_obj:
                        if ar:
                            message = "لا يمكنك الحجز في الماضي."
                        else:
                            message = "You can't reserve in the past"
                        result = {"success": False, "message": message}
                        return result
                
                if check_time_slot not in available:
                    if approximate:
                        nearest_slot = find_nearest_time_slot(check_time_slot, available.keys())
                        if nearest_slot is None:
                            if ar:
                                message = "لم يتم العثور على موعد متاح للتقريب."
                            else:
                                message = "No available time slot found for approximation."
                            result = {"success": False, "message": message}
                            conn.close()
                            return result
                        check_time_slot = nearest_slot
                    else:
                        message = f"Reservation modification failed. The time slot is not within {available}."
                        if ar:
                            message = f" {available}  فشل تعديل الحجز. الوقت الذي تم اختياره ليس من ضمن."
                        result = {"success": False, "message": message}
                        conn.close()
                        return result
            except ValueError as e:
                message = f"Invalid time format: {str(e)}"
                if ar:
                    message = "صيغة الوقت غير صالحة"
                result = {"success": False, "message": message}
                return result
        else:
            check_time_slot = existing_time_slot
        
        # Build update query with properly processed values
        update_fields = []
        update_values = []
        
        if new_date:
            update_fields.append("date = ?")
            update_values.append(check_date)
            
        if new_time_slot:
            update_fields.append("time_slot = ?")
            update_values.append(check_time_slot)
        
        if new_type:
            if new_type not in (0, 1):
                if ar:
                    message = "فشل تعديل الحجز. نوع غير صالح (يجب أن يكون 0 أو 1)."
                else:
                    message = "Reservation modification failed. Invalid type (must be 0 or 1)."
                result = {"success": False, "message": message}
                return result
            update_fields.append("type = ?")
            update_values.append(new_type)
        
        if new_name:
            new_name = fix_unicode_sequence(new_name)
            update_fields.append("customer_name = ?")
            update_values.append(new_name)
            
        # Check for max reservation at the new date/time
        cursor.execute(
            "SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ? AND wa_id != ?",
            (check_date, check_time_slot, wa_id)
        )
        if cursor.fetchone()[0] >= max_reservations:
            conn.close()
            message = "This time slot is fully booked. Please choose another."
            if ar:
                message = "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر."
            result = {"success": False, "message": message}
            return result

        # Add final WHERE clause parameters
        update_values.append(wa_id)
        update_values.append(curr_date)

        # Use parameterized query with placeholders
        update_query = f"UPDATE reservations SET {', '.join(update_fields)} WHERE wa_id = ? AND date >= ?"
        cursor.execute(update_query, update_values)
        conn.commit()
        conn.close()

        result = {"success": True, "message": "Reservation modified successfully."}
        if ar:
            result["message"] = "تم تعديل الحجز بنجاح."
        return result

    except Exception as e:
        message = f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."
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
    is_valid_wa_id = is_valid_number(wa_id)
    if is_valid_wa_id != True:
        return is_valid_wa_id
    try:
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT date, time_slot, customer_name, type FROM reservations WHERE wa_id = ? AND date >= ?",
            (wa_id, now.strftime("%Y-%m-%d"))
        )
        rows = cursor.fetchall()
        conn.close()
        reservation_list = [dict(row) for row in rows]
        return reservation_list
    except Exception as e:
        result = {"success": False, "message": "System error occurred. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_customer_reservations failed, error: {e}")
        return result

def get_time_slots(date_str, hijri=False, vacation={}):
    """
    Get all the time slots for a given date.
    
    Parameters:
        date_str (str): Date string to get time slots for (can be Hijri or Gregorian)
        hijri (bool): Flag indicating if the provided date string is in Hijri format
        vacation (dict): Dictionary of vacation periods with start dates and durations
        
    Returns:
        dict: Dictionary of available time slots or error message
    
    Example:
        >>> get_time_slots("2023-10-15")
        {'11:00 AM': 0, '01:00 PM': 0, '03:00 PM': 0, '05:00 PM': 0}
        
        >>> get_time_slots("1445-09-10", hijri=True)
        {'10:00 AM': 0, '12:00 PM': 0, '02:00 PM': 0, '04:00 PM': 0}
        
        >>> get_time_slots("2023-10-15", vacation={"2023-10-15": 1, "2023-10-20": 2})
        {'success': False, 'message': 'Doctor is on vacation.'}
    """
    try:
        # Default vacation configuration
        if not vacation:
            # Check if there are vacation dates in config
            vacation_start_dates = config.get("VACATION_START_DATES", "")
            vacation_durations = config.get("VACATION_DURATIONS", "")
            
            # Parse multiple vacation periods if provided in config
            if vacation_start_dates and vacation_durations:
                # Handle both single values and multiple comma-separated values
                start_dates = [d.strip() for d in str(vacation_start_dates).split(',') if d.strip()]
                durations = [int(d.strip()) for d in str(vacation_durations).split(',') if d.strip()]
            
                # Create vacation dictionary {start_date: duration}
                if len(start_dates) == len(durations):
                    vacation = {start_date: duration for start_date, duration in zip(start_dates, durations)}
                else:
                    vacation = {}

        # Parse the provided date
        gregorian_date_str = parse_date(date_str, hijri=hijri)
        now = datetime.now(tz=ZoneInfo("Asia/Riyadh")).date()
        date_obj = datetime.strptime(gregorian_date_str, "%Y-%m-%d").date()
        if date_obj < now:
            message = "Cannot reserve a time slot in the past."
            return {"success": False, "message": message}
        # Check if the date falls within the vacation period
        if vacation:
            for start_day, duration in vacation.items():
                start_date = datetime.strptime(start_day, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
                end_date = start_date + timedelta(days=duration)
                if start_date.date() <= date_obj.date() <= end_date.date():
                    message = f"We are on vacation from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}. {config.get('VACATION_MESSAGE', '')}"
                    return {"success": False, "message": message}

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
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(16, 21, 2)}  # 4 PM to 9 PM
        else:  # Sunday to Thursday
            available = {f"{hour % 12 or 12}:00 {'AM' if hour < 12 else 'PM'}": 0 for hour in range(11, 17, 2)}  # 11 AM to 5 PM

        # Filter out past time slots if the date is today
        if date_obj.date() == now.date():
            available = {time: count for time, count in available.items() if datetime.strptime(time, "%I:%M %p").time() > now.time()}

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
      - wa_id: WhatsApp ID
      - customer_name: Customer's name
      - date_str: Date string (can be Hijri or Gregorian)
      - time_slot: Desired time slot
      - reservation_type: Type of reservation (0 or 1)
      - hijri: Boolean indicating if the input date is Hijri (default: False)
      - max_reservations: Maximum allowed reservations per time slot on a day (default: 5)
      - ar: If True, returns error messages in Arabic (default: False)
    """
    is_valid_wa_id = is_valid_number(wa_id, ar)
    if is_valid_wa_id != True:
        return is_valid_wa_id
    
    if not customer_name:
        message = "Customer name has to be provided."
        if ar:
            message = "يجب تقديم اسم العميل."
        result = {"success": False, "message": message}
        return result
    customer_name = fix_unicode_sequence(customer_name)
    
    if reservation_type not in (0, 1):
        message = "Invalid reservation type. Must be 0 or 1."
        if ar:
            message = "نوع الحجز غير صالح. يجب أن يكون 0 أو 1."
        result = {"success": False, "message": message}
        return result

    try:
        # Normalize and convert date and time.
        date_str = parse_date(date_str, hijri)
        time_slot = parse_time(time_slot)
        # Convert Gregorian to Hijri for output purposes.
        hijri_date_obj = convert.Gregorian(*map(int, date_str.split('-'))).to_hijri()
        hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"

        # Check if the reservation date is in the past.
        reservation_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = datetime.now(tz=ZoneInfo("Asia/Riyadh")).date()
        if reservation_date < today:
            message = "Cannot reserve a time slot in the past."
            if ar:
                message = "لا يمكن حجز موعد في الماضي."
            result = {"success": False, "message": message}
            return result

        # Validate the available time slots for the date.
        available = get_time_slots(date_str)
        if isinstance(available, dict) and "success" in available and not available["success"]:
            return available

        if time_slot not in available:
            message = "Invalid time slot."
            if ar:
                message = f" {available} فشل الحجز. الوقت الذي تم اختياره ليس من ضمن."
            result = {"success": False, "message": message}
            return result

        # Check if the user already has any upcoming reservations.
        existing_reservations = get_customer_reservations(wa_id)
        if existing_reservations and isinstance(existing_reservations, list) and len(existing_reservations) > 0:
            # Modify the existing reservation
            modify_result = modify_reservation(wa_id, new_date=date_str, new_time_slot=time_slot, new_name=customer_name, new_type=reservation_type, hijri=hijri, ar=ar)
            return modify_result

        conn = get_connection()
        cursor = conn.cursor()

        # Check if the desired time slot has reached the maximum reservations.
        cursor.execute("SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ?", (date_str, time_slot))
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
            (wa_id, customer_name, date_str, time_slot, reservation_type)
        )

        conn.commit()
        conn.close()

        result = {
            "success": True,
            "gregorian_date": date_str,
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

def delete_reservation(wa_id, date_str=None, time_slot=None, hijri=False, ar=False):
    """
    Delete a reservation for a customer.
    If date_str and time_slot are not provided, delete all reservations for the customer.

    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation should be deleted.
        date_str (str, optional): Date for the reservation in ISO format (e.g., 'YYYY-MM-DD').
                                  If not provided, all reservations are deleted.
        time_slot (str, optional): Time slot for the reservation (expected format: '%I:%M %p', e.g., '11:00 AM').
                                   If not provided, all reservations are deleted.
        hijri (bool): Flag indicating if the provided date string is in Hijri format.
        ar (bool): If True, returns error messages in Arabic.

    Returns:
        dict: Result of the deletion operation with success status and message.
    """
    try:
        is_valid_wa_id = is_valid_number(wa_id, ar)
        if is_valid_wa_id != True:
            return is_valid_wa_id
        date_str = parse_date(date_str, hijri) if date_str else None
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
    
def cancel_reservation(wa_id, date_str=None, hijri=False, ar=False):
    """
    Cancel a reservation for a customer.
    This performs a soft delete by moving the reservations to a 'cancelled_reservations' table.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation should be cancelled.
        date_str (str, optional): Date for the reservation in ISO format (e.g., 'YYYY-MM-DD').
                                  If not provided, all reservations are cancelled.
        hijri (bool): Flag indicating if the provided date string is in Hijri format.
        ar (bool): If True, returns error messages in Arabic.
        
    Returns:
        dict: Result of the cancellation operation with success status and message.
    """
    
    is_valid_wa_id = is_valid_number(wa_id, ar)
    if is_valid_wa_id != True:
        return is_valid_wa_id
        
    try:
        date_str = parse_date(date_str, hijri) if date_str else None
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
        all = get_time_slots(date_str)
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
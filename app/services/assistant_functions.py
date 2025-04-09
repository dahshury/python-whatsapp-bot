import json
import logging
import datetime
from datetime import timedelta
from zoneinfo import ZoneInfo
from app.config import config
from app.db import get_connection
from app.utils import (
    send_whatsapp_location, is_valid_number, fix_unicode_sequence, parse_date, parse_time, 
    normalize_time_format, is_valid_date_time, is_vacation_period,
    get_time_slots, filter_past_time_slots, 
    find_nearest_time_slot, make_thread, validate_reservation_type
)
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
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
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
        if isinstance(is_valid_wa_id, dict) and is_valid_wa_id.get("success") == False:
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
        new_time_slot (str, optional): New time slot (either 12-hour or 24-hour format)
        new_name (str, optional): New customer name
        new_type (int, optional): Reservation type (0 for Check-Up, 1 for Follow-Up)
        approximate (bool, optional): If True, reserves the nearest available slot if the requested slot is not available
        hijri (bool): Flag indicating if the provided date is in Hijri format
        ar (bool): If True, returns error messages in Arabic
        
    Returns:
        dict: Result of the modification operation with success status and message
    """
    try:        
        # Phone number validation
        is_valid_wa_id = is_valid_number(wa_id, ar)
        if is_valid_wa_id != True:
            return is_valid_wa_id
        
        # Check if at least one parameter is provided
        if not any([new_date, new_time_slot, new_name, new_type is not None]):
            message = "No new details provided for modification."
            if ar:
                message = "لم يتم تقديم تفاصيل جديدة للتعديل."
            result = {"success": False, "message": message}
            return result
        
        # Get current date/time in Saudi Arabia timezone
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        
        # Get all UPCOMING reservations for this user using get_customer_reservations
        upcoming_reservations = get_customer_reservations(wa_id)
        
        # Handle error response from get_customer_reservations
        if isinstance(upcoming_reservations, dict) and "success" in upcoming_reservations and not upcoming_reservations["success"]:
            return upcoming_reservations
        
        # Check if there's exactly one upcoming reservation
        if len(upcoming_reservations) == 0:
            if ar:
                message = "لم يتم العثور على حجوزات قادمة للتعديل. الرجاء حجز موعد جديد."
            else:
                message = "No upcoming reservations found to modify. Please reserve a new appointment."
            result = {"success": False, "message": message}
            return result
            
        # If multiple upcoming reservations, return error
        if len(upcoming_reservations) > 1:
            translated_reservations = upcoming_reservations
            message = f"Multiple upcoming reservations found: {translated_reservations}. You can only have one future reservation. Please cancel unused reservations."
            if ar:
                translated_reservations_str = ""
                for res in translated_reservations:
                    res_type = "كشف" if res["type"] == 0 else "مراجعة"
                    translated_reservations_str += f"\n- {res['date']} في {res['time_slot']} ({res_type})"
                message = f"تم العثور على حجوزات متعددة قادمة: {translated_reservations_str}\nيمكنك أن تمتلك حجز مستقبلي واحد فقط. الرجاء إلغاء الحجوزات الغير مستعملة"
            result = {"success": False, "message": message}
            return result
            
        # Now we have exactly one upcoming reservation to modify
        existing_reservation = upcoming_reservations[0]
        existing_date = existing_reservation["date"]
        existing_time_slot = existing_reservation["time_slot"]
        
        # Initialize with existing values
        parsed_date_str = existing_date
        parsed_time_str = existing_time_slot
        
        # Handle new date if provided
        if new_date:
            try:
                # Parse date (Hijri or Gregorian based on hijri flag)
                parsed_date_str = parse_date(new_date, hijri=hijri)
            except Exception as e:
                if ar:
                    message = "تاريخ غير صالح."
                else:
                    message = f"Invalid date format: {str(e)} for calendar type {f'hijri' if hijri else 'gregorian'}"
                result = {"success": False, "message": message}
                return result
        
        # Handle new time slot if provided
        if new_time_slot:
            try:
                # Parse and normalize time to 24-hour format
                parsed_time_str = normalize_time_format(new_time_slot, to_24h=True)
            except Exception as e:
                if ar:
                    message = "صيغة الوقت غير صالحة."
                else:
                    message = f"Invalid time format: {str(e)}"
                result = {"success": False, "message": message}
                return result
        
        # Create datetime objects for validation
        try:
            # Parse the reservation datetime
            reservation_date = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
            time_parts = parsed_time_str.split(":")
            reservation_time = reservation_date.replace(hour=int(time_parts[0]), minute=int(time_parts[1]))
            
            # Check if reservation is in the past
            if reservation_time < now:
                if ar:
                    message = "لا يمكنك الحجز في الماضي."
                else:
                    message = "Cannot reserve in the past."
                result = {"success": False, "message": message}
                return result
        except Exception as e:
            if ar:
                message = "صيغة التاريخ أو الوقت غير صالحة."
            else:
                message = f"Invalid date or time format: {str(e)}"
            result = {"success": False, "message": message}
            return result
            
        # Get available time slots and validate the selected time
        if new_time_slot:
            # Convert back to 12-hour format for display and validation with available slots
            display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)
            
            # Get available time slots (which are in 12-hour format)
            available_slots = get_available_time_slots(parsed_date_str, max_reservations, hijri=False)
            
            # Handle error response from get_available_time_slots
            if isinstance(available_slots, dict) and "success" in available_slots and not available_slots["success"]:
                return available_slots
            
            # Convert the list of available slots to a set for faster lookups
            available_slots_set = set(available_slots)
            
            if display_time_slot not in available_slots_set:
                if approximate:
                    nearest_slot = find_nearest_time_slot(display_time_slot, available_slots)
                    if nearest_slot is None:
                        if ar:
                            message = "لم يتم العثور على موعد متاح للتقريب."
                        else:
                            message = "No available time slot found for approximation."
                        result = {"success": False, "message": message}
                        return result
                    parsed_time_str = normalize_time_format(nearest_slot, to_24h=True)
                else:
                    message = f"Reservation modification failed. The time slot is not available. Available slots: {available_slots}"
                    if ar:
                        message = f" {available_slots}  فشل تعديل الحجز. الوقت الذي تم اختياره ليس متاحًا. الأوقات المتاحة:"
                    result = {"success": False, "message": message}
                    return result
        
        # Build update query with properly processed values
        update_fields = []
        update_values = []
        
        if new_date:
            update_fields.append("date = ?")
            update_values.append(parsed_date_str)
            
        if new_time_slot:
            update_fields.append("time_slot = ?")
            update_values.append(parsed_time_str)
        
        if new_type is not None:  # Allow 0 as a valid value
            # Validate reservation type
            is_valid, error_result, parsed_type = validate_reservation_type(new_type, ar)
            if not is_valid:
                return error_result
                
            update_fields.append("type = ?")
            update_values.append(parsed_type)
        
        if new_name:
            new_name = fix_unicode_sequence(new_name)
            update_fields.append("customer_name = ?")
            update_values.append(new_name)
            
        # If no changes to make, return early
        if not update_fields:
            if ar:
                message = "لم يتم إجراء أي تغييرات."
            else:
                message = "No changes were made."
            result = {"success": True, "message": message}
            return result
            
        # Check for max reservation at the new date/time
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ? AND wa_id != ?",
            (parsed_date_str, parsed_time_str, wa_id)
        )
        if cursor.fetchone()[0] >= max_reservations:
            conn.close()
            message = "This time slot is fully booked. Please choose another."
            if ar:
                message = "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر."
            result = {"success": False, "message": message}
            return result

        # Use current date for WHERE clause to only update future reservations
        curr_date = now.strftime("%Y-%m-%d")
        
        # Add final WHERE clause parameters
        update_values.append(wa_id)
        update_values.append(curr_date)

        # Use parameterized query with placeholders
        update_query = f"UPDATE reservations SET {', '.join(update_fields)} WHERE wa_id = ? AND date >= ?"
        cursor.execute(update_query, update_values)
        conn.commit()
        conn.close()

        # Convert time back to 12-hour format for display
        display_time = normalize_time_format(parsed_time_str, to_24h=False)
        
        result = {
            "success": True, 
            "message": "Reservation modified successfully.",
            "time_slot": display_time
        }
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
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
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

def reserve_time_slot(wa_id, customer_name, date_str, time_slot, reservation_type, hijri=False, max_reservations=5, ar=False):
    """
    Reserve a time slot for a customer. Handles even non-ISO-like formats by converting
    the input date (Hijri or Gregorian) into a standardized ISO (YYYY-MM-DD) format.
    Time is stored in 24-hour format internally.
    
    Parameters:
      - wa_id: WhatsApp ID
      - customer_name: Customer's name
      - date_str: Date string (can be Hijri or Gregorian)
      - time_slot: Desired time slot (can be 12-hour or 24-hour format)
      - reservation_type: Type of reservation (0 for Check-Up, 1 for Follow-Up)
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
    
    # Validate reservation type
    is_valid, error_result, parsed_type = validate_reservation_type(reservation_type, ar)
    if not is_valid:
        return error_result
    
    # Store the validated type
    reservation_type = parsed_type

    try:
        # Get current date/time in Saudi Arabia timezone
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        
        # Process date - convert from Hijri if needed
        try:
            parsed_date_str = parse_date(date_str, hijri=hijri)
        except Exception as e:
            if ar:
                message = "تاريخ غير صالح."
            else:
                message = f"Invalid date format: {str(e)} for calendar type {f'hijri' if hijri else 'gregorian'}"
            result = {"success": False, "message": message}
            return result
        
        # Process time - normalize to 24-hour format
        try:
            parsed_time_str = normalize_time_format(time_slot, to_24h=True)
        except Exception as e:
            if ar:
                message = "صيغة الوقت غير صالحة."
            else:
                message = f"Invalid time format: {str(e)}"
            result = {"success": False, "message": message}
            return result
        
        # Create datetime objects for validation
        try:
            # Parse the reservation datetime
            reservation_date = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Riyadh"))
            time_parts = parsed_time_str.split(":")
            reservation_time = reservation_date.replace(hour=int(time_parts[0]), minute=int(time_parts[1]))
            
            # Check if reservation is in the past
            if reservation_time < now:
                if ar:
                    message = "لا يمكنك الحجز في الماضي."
                else:
                    message = "Cannot reserve in the past."
                result = {"success": False, "message": message}
                return result
        except Exception as e:
            if ar:
                message = "صيغة التاريخ أو الوقت غير صالحة."
            else:
                message = f"Invalid date or time format: {str(e)}"
            result = {"success": False, "message": message}
            return result
            
        # Convert Gregorian to Hijri for output purposes
        hijri_date_obj = convert.Gregorian(*map(int, parsed_date_str.split('-'))).to_hijri()
        hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"

        # Get 12-hour format time for display and validation
        display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)

        # Validate the available time slots for the date
        available_slots = get_available_time_slots(parsed_date_str, max_reservations, hijri=False)
        if isinstance(available_slots, dict) and "success" in available_slots and not available_slots["success"]:
            return available_slots

        if display_time_slot not in available_slots:
            if ar:
                message = f"فشل الحجز. الوقت الذي تم اختياره ({display_time_slot}) غير متاح. الأوقات المتاحة: {', '.join(available_slots)}"
            else:
                message = f"Reservation failed. The selected time slot ({display_time_slot}) is not available. Available slots: {', '.join(available_slots)}"
            result = {"success": False, "message": message}
            return result

        # Check if the user already has any upcoming reservations
        existing_reservations = get_customer_reservations(wa_id)
        if existing_reservations and isinstance(existing_reservations, list) and len(existing_reservations) > 0:
            # Modify the existing reservation
            modify_result = modify_reservation(
                wa_id, 
                new_date=parsed_date_str, 
                new_time_slot=parsed_time_str, 
                new_name=customer_name, 
                new_type=reservation_type, 
                hijri=False, 
                ar=ar
            )
            return modify_result

        conn = get_connection()
        cursor = conn.cursor()

        # Check if the desired time slot has reached the maximum reservations
        cursor.execute(
            "SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ?", 
            (parsed_date_str, parsed_time_str)
        )
        if cursor.fetchone()[0] >= max_reservations:
            conn.close()
            message = "This time slot is fully booked. Please choose another slot."
            if ar:
                message = "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر."
            result = {"success": False, "message": message}
            return result

        # Ensure a thread record exists
        make_thread(wa_id)
        
        # Insert the new reservation (storing the Gregorian date and 24-hour time for consistency)
        cursor.execute(
            "INSERT INTO reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
            (wa_id, customer_name, parsed_date_str, parsed_time_str, reservation_type)
        )

        conn.commit()
        conn.close()

        result = {
            "success": True,
            "gregorian_date": parsed_date_str,
            "hijri_date": hijri_date_str,
            "time_slot": display_time_slot,
            "type": reservation_type,
            "message": "Reservation successful."
        }
        if ar:
            result["message"] = "تم الحجز بنجاح."
        return result

    except Exception as e:
        message = f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."
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
        time_slot (str, optional): Time slot for the reservation (either 12-hour or 24-hour format).
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
            
        # Get upcoming reservations
        upcoming_reservations = get_customer_reservations(wa_id)
        
        # Handle error response from get_customer_reservations
        if isinstance(upcoming_reservations, dict) and "success" in upcoming_reservations and not upcoming_reservations["success"]:
            return upcoming_reservations
            
        # Check if there are any reservations
        if len(upcoming_reservations) == 0:
            message = "No reservations found for the customer."
            if ar:
                message = "لم يتم العثور على حجوزات للعميل."
            result = {
                "success": False,
                "message": message
            }
            return result
            
        # Initialize variables
        parsed_date_str = None
        parsed_time_str = None
        
        # Process date if provided
        if date_str:
            try:
                parsed_date_str = parse_date(date_str, hijri=hijri)
            except Exception as e:
                if ar:
                    message = "تاريخ غير صالح."
                else:
                    message = f"Invalid date format: {str(e)}"
                result = {"success": False, "message": message}
                return result
        
        # Process time if provided
        if time_slot:
            try:
                parsed_time_str = normalize_time_format(time_slot, to_24h=True)
            except Exception as e:
                if ar:
                    message = "صيغة الوقت غير صالحة."
                else:
                    message = f"Invalid time format: {str(e)}"
                result = {"success": False, "message": message}
                return result
            
        conn = get_connection()
        cursor = conn.cursor()
        
        # If either date_str or time_slot is missing, delete all reservations for this customer
        if parsed_date_str is None or parsed_time_str is None:
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
        
        # Otherwise, delete the specified reservation
        else:
            # Check if the specific reservation exists
            found = False
            for res in upcoming_reservations:
                if res["date"] == parsed_date_str and res["time_slot"] == parsed_time_str:
                    found = True
                    break
                    
            if not found:
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
                (wa_id, parsed_date_str, parsed_time_str)
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
        message = f"System error occurred: {str(e)}."
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
    try:
        is_valid_wa_id = is_valid_number(wa_id, ar)
        if is_valid_wa_id != True:
            return is_valid_wa_id
            
        # Get upcoming reservations
        upcoming_reservations = get_customer_reservations(wa_id)
        
        # Handle error response from get_customer_reservations
        if isinstance(upcoming_reservations, dict) and "success" in upcoming_reservations and not upcoming_reservations["success"]:
            return upcoming_reservations
            
        # Check if there are any reservations
        if len(upcoming_reservations) == 0:
            message = "No reservations found for the customer."
            if ar:
                message = "لم يتم العثور على حجوزات للعميل."
            result = {
                "success": False,
                "message": message
            }
            return result
            
        # Process date if provided
        parsed_date_str = None
        if date_str:
            try:
                parsed_date_str = parse_date(date_str, hijri=hijri)
            except Exception as e:
                if ar:
                    message = "تاريخ غير صالح."
                else:
                    message = f"Invalid date format: {str(e)}"
                result = {"success": False, "message": message}
                return result
                
        # Filter reservations by date if specified
        reservations_to_cancel = []
        if parsed_date_str is not None:
            for res in upcoming_reservations:
                if res["date"] == parsed_date_str:
                    reservations_to_cancel.append(res)
            
            if not reservations_to_cancel:
                message = "Reservation not found for the specified date."
                if ar:
                    message = "لم يتم العثور على حجز في التاريخ المحدد."
                result = {
                    "success": False,
                    "message": message
                }
                return result
        else:
            # Cancel all reservations
            reservations_to_cancel = upcoming_reservations
                
        conn = get_connection()
        cursor = conn.cursor()
        
        # Add wa_id to each reservation for insertion
        for res in reservations_to_cancel:
            res["wa_id"] = wa_id
            
        # Move the reservations to cancelled_reservations and delete from reservations
        cursor.executemany(
            "INSERT INTO cancelled_reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
            [(res["wa_id"], res["customer_name"], res["date"], res["time_slot"], res["type"]) for res in reservations_to_cancel]
        )
        
        # Delete the reservations
        if parsed_date_str is None:
            # Delete all reservations for the wa_id
            cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
            message = "All reservations cancelled."
            if ar:
                message = "تم إلغاء جميع الحجوزات."
        else:
            # Delete reservations for the specific date
            cursor.execute(
                "DELETE FROM reservations WHERE wa_id = ? AND date = ?",
                (wa_id, parsed_date_str)
            )
            message = "Reservation cancelled."
            if ar:
                message = "تم إلغاء الحجز."
                
        conn.commit()
        conn.close()
        
        result = {
            "success": True,
            "message": message
        }
        return result

    except Exception as e:
        message = f"System error occurred: {str(e)}."
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
    Get the available time slots for a given date, considering vacation periods and past dates.
    
    Parameters:
        date_str (str): Date string to get available time slots for.
                        If 'hijri' is true, the date string can be in various Hijri formats such as
                        '1447-09-10', '10 Muharram 1447', or '10, Muharram, 1447'.
                        Otherwise, expects Gregorian date formats like 'YYYY-MM-DD'.
        max_reservations (int): Maximum number of reservations allowed per time slot
        hijri (bool): Flag indicating if the provided date string is in Hijri format
        
    Returns:
        list: List of available time slots in 12-hour format (for display)
    """
    try:
        # Get current date/time in Saudi Arabia timezone
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        
        # Process date - convert from Hijri if needed
        try:
            parsed_date_str = parse_date(date_str, hijri=hijri)
        except Exception as e:
            return {"success": False, "message": f"Invalid date format: {str(e)}"}
        
        # Convert parsed date to datetime object
        date_obj = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
        
        # Check if the date is in the past
        if date_obj < now.date():
            return {"success": False, "message": "Cannot get slots for past dates."}
        
        # Check if the date falls within a vacation period
        is_vacation, vacation_message = is_vacation_period(date_obj)
        if is_vacation:
            return {"success": False, "message": vacation_message}
        
        # Get all time slots for the date with filtering for past times if date is today
        all_slots = get_time_slots(date_obj=date_obj, filter_past=(date_obj == now.date()))
        
        # If get_time_slots returns an error, pass it through
        if isinstance(all_slots, dict) and "success" in all_slots and not all_slots["success"]:
            return all_slots
        
        # Create a mapping of 12-hour format to 24-hour format for database queries
        time_format_map = {
            slot: normalize_time_format(slot, to_24h=True) 
            for slot in all_slots.keys()
        }
        
        # Reverse mapping (24-hour to 12-hour) for results
        reverse_map = {v: k for k, v in time_format_map.items()}

        # Get reservation counts for each time slot (using 24-hour format for database query)
        conn = get_connection()
        cursor = conn.cursor()
        
        # Format query placeholders for the IN clause
        placeholders = ', '.join(['?'] * len(time_format_map.values()))
        
        if placeholders:  # Only query if there are time slots
            # Query using 24-hour format time slots
            cursor.execute(
                f"SELECT time_slot, COUNT(*) as count FROM reservations WHERE date = ? AND time_slot IN ({placeholders}) GROUP BY time_slot",
                [parsed_date_str] + list(time_format_map.values())
            )
            rows = cursor.fetchall()
            
            # Process results, mapping 24-hour format back to 12-hour format
            if rows:
                for row in rows:
                    db_time_slot = row["time_slot"]
                    # If time in database is in 24-hour format, map it back to 12-hour for display
                    if db_time_slot in reverse_map:
                        display_time_slot = reverse_map[db_time_slot]
                        if display_time_slot in all_slots:
                            all_slots[display_time_slot] += row["count"]
                    # Fallback for existing data that might be in 12-hour format
                    elif db_time_slot in all_slots:
                        all_slots[db_time_slot] += row["count"]
        
        conn.close()
        
        # Return only slots with availability (in 12-hour format for display)
        result = [ts for ts, count in all_slots.items() if count < max_reservations]
        return result
    except Exception as e:
        result = {"success": False, "message": f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."}
        logging.error(f"Function call get_available_time_slots failed, error: {e}")
        return result

def get_available_nearby_dates_for_time_slot(time_slot, days_forward=7, days_backward=0, max_reservations=5, hijri=False):
    """
    Get the available nearby dates for a given time slot within a specified range of days.
    Returns a list of dictionaries with date, time_slot, and whether it's an exact match.
    
    Parameters:
        time_slot (str): The time slot to check availability for (can be 12-hour or 24-hour format)
        days_forward (int): Number of days to look forward for availability, must be a non-negative integer
        days_backward (int): Number of days to look backward for availability, must be a non-negative integer
        max_reservations (int): Maximum reservations per slot (default: 5)
        hijri (bool): Flag to indicate if the output dates should be converted to Hijri format
    
    Returns:
        list: List of dictionaries with available dates and times
              [{"date": str, "time_slot": str, "is_exact": bool}, ...]
    """
    try:
                
        # Parse the requested time slot to 24-hour format for internal processing
        parsed_time_str = normalize_time_format(time_slot, to_24h=True)
        requested_time = datetime.datetime.strptime(parsed_time_str, "%H:%M")
        requested_minutes = requested_time.hour * 60 + requested_time.minute
        
        # Get 12-hour format for display
        display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)
        
        available_dates = []
        # Get current date/time in Asia/Riyadh timezone
        today = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        now = today.date()
        conn = get_connection()
        cursor = conn.cursor()

        # Include today in the search
        date_range = list(range(-days_backward, days_forward + 1))
        
        for day_offset in date_range:
            date_obj = today + datetime.timedelta(days=day_offset)
            date_str = date_obj.strftime("%Y-%m-%d")
            date_day = date_obj.date()
            
            # Skip dates in the past
            if date_day < now:
                continue
                
            # Skip dates during vacation
            is_vacation, _ = is_vacation_period(date_day)
            if is_vacation:
                continue
            
            # Get all slots for this date with past filtering for today
            all_slots = get_time_slots(date_obj=date_day, filter_past=(date_day == now))
            
            # Skip if get_time_slots returns an empty/non-dict result
            if not isinstance(all_slots, dict) or not all_slots:
                continue
                
            # Parse all available slots and convert to 24-hour format
            parsed_slots = []
            for slot in all_slots.keys():
                try:
                    # Convert to 24-hour format for comparison
                    slot_24h = normalize_time_format(slot, to_24h=True)
                    slot_time = datetime.datetime.strptime(slot_24h, "%H:%M")
                    parsed_slots.append((slot, slot_time))
                except ValueError:
                    continue  # Skip invalid slots
            
            if not parsed_slots:
                continue
            
            # Find the closest slot based on time difference in minutes
            closest_slot, closest_time = min(
                parsed_slots,
                key=lambda x: abs((x[1].hour * 60 + x[1].minute) - requested_minutes)
            )
            
            # Determine if this is an exact match (using 24-hour format for comparison)
            is_exact = (closest_time.hour == requested_time.hour and 
                       closest_time.minute == requested_time.minute)
            
            # Get 24-hour format of the closest slot for database query
            closest_slot_24h = normalize_time_format(closest_slot, to_24h=True)
            
            # Check reservation count for the closest slot
            cursor.execute(
                "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND time_slot = ?",
                (date_str, closest_slot_24h)
            )
            row = cursor.fetchone()
            count = row["count"] if row else 0
            
            # Add date if the slot has availability
            if count < max_reservations:
                available_dates.append({
                    "date": date_str,
                    "time_slot": closest_slot,  # Keep 12-hour format for display
                    "time_slot_24h": closest_slot_24h,  # Include 24-hour format for reference
                    "is_exact": is_exact
                })
        
        conn.close()
        
        # Convert to Hijri format if requested
        if hijri:
            for entry in available_dates:
                date_obj = datetime.datetime.strptime(entry["date"], "%Y-%m-%d")
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
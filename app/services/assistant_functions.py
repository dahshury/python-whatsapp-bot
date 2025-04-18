import logging
import datetime
from zoneinfo import ZoneInfo
from app.config import config
from app.db import get_connection
from app.i18n import get_message
from app.utils import (
    send_whatsapp_location, is_valid_number, fix_unicode_sequence, parse_date, parse_time, 
    normalize_time_format, is_vacation_period, format_response, get_time_slots, make_thread, validate_reservation_type, is_valid_date_time
)
from hijri_converter import convert
import sqlite3, time
# Use configured timezone
TIMEZONE = config.get("TIMEZONE", "Asia/Riyadh")

def send_business_location(wa_id):
    """
    Sends the business WhatsApp location message using the WhatsApp API.
    
    Parameters:
        wa_id (str): WhatsApp ID to send the location to
        
    Returns:
        dict: Result of the operation with:
            - success (bool): True if location was sent successfully, False otherwise
            - message (str): Human-readable status message
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
    """
    try:
        is_valid_wa_id = is_valid_number(wa_id)
        if is_valid_wa_id is not True:
            return is_valid_wa_id
        status = send_whatsapp_location(
            wa_id, config["BUSINESS_LATITUDE"], config["BUSINESS_LONGITUDE"],
            config['BUSINESS_NAME'], config['BUSINESS_ADDRESS']
        )
        ok = status.get("status") != "error"
        return format_response(ok, message=get_message("location_sent" if ok else "system_error_try_later"))
    except Exception as e:
        logging.error(f"Function call send_business_location failed, error: {e}")
        return format_response(False, message=get_message("system_error_try_later"))

def get_current_datetime():
    """
    Get the current date and time in both Hijri and Gregorian calendars with timezone set to Asia/Riyadh.
    
    Returns:
        dict: A dictionary containing:
            - gregorian_date (str): Current date in Gregorian calendar (YYYY-MM-DD format)
            - makkah_time (str): Current time in Makkah (HH:MM AM/PM format)
            - hijri_date (str): Current date in Hijri calendar (YYYY-MM-DD format)
            - day_name (str): Abbreviated weekday name (e.g., 'Mon', 'Tue')
            - is_ramadan (bool): True if current Hijri month is Ramadan (9), False otherwise
            
        On error, returns:
            - success (bool): False
            - message (str): Error message for user
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
    """
    try:
        now = datetime.datetime.now(tz=ZoneInfo(TIMEZONE))
        gregorian_date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H:%M %p")
        
        hijri_date = convert.Gregorian(now.year, now.month, now.day).to_hijri()
        hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
        
        day_name = now.strftime("%a")
        is_ramadan = hijri_date.month == 9
        
        data = {
            "gregorian_date": gregorian_date_str,
            "makkah_time": time_str,
            "hijri_date": hijri_date_str,
            "day_name": day_name,
            "is_ramadan": is_ramadan
        }
        return format_response(True, data=data)
    except Exception as e:
        logging.error(f"Function call get_current_datetime failed, error: {e}")
        return format_response(False, message=get_message("system_error_contact_secretary"))
    
def modify_id(old_wa_id, new_wa_id, ar=False):
    """
    Modify the WhatsApp ID (wa_id) for a customer in all related database tables.
    
    This function updates a customer's WhatsApp ID across all database tables:
    threads, conversation, reservations, and cancelled_reservations.
    
    Parameters:
        old_wa_id (str): The current WhatsApp ID to be replaced
        new_wa_id (str): The new WhatsApp ID to replace with
        ar (bool, optional): If True, returns error messages in Arabic. Defaults to False.
        
    Returns:
        dict: Result of the modification operation with:
            - success (bool): True if the ID was modified successfully, False otherwise
            - message (str): Human-readable status message in English or Arabic based on 'ar' parameter
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
    """
    try:
        is_valid_wa_id = is_valid_number(new_wa_id, ar)
        if isinstance(is_valid_wa_id, dict) and is_valid_wa_id.get("success") == False:
            return is_valid_wa_id
        
        if old_wa_id == new_wa_id:
            message = "The new wa_id is the same as the old wa_id."
            if ar:
                message = "رقم الواتساب الجديد هو نفسه رقم الواتساب القديم."
            return format_response(True, message=get_message("wa_id_same", ar))

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
        
        msg = "تم تعديل رقم الواتساب بنجاح." if ar else "wa_id modified successfully."
        return format_response(True, message=get_message("wa_id_modified", ar))
    
    except Exception as e:
        logging.error(f"Function call modify_id failed, error: {e}")
        message = "System error occurred"
        if ar:
            message = "حدث خطأ في النظام"
        return format_response(False, message=get_message("system_error_try_later", ar))

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
        
        # Ensure there is something to modify
        if not any([new_date, new_time_slot, new_name, new_type is not None]):
            return format_response(False, message=get_message("no_new_details", ar))
        
        # Get current date/time in Saudi Arabia timezone
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        
        # Retrieve and unpack upcoming reservations
        resp = get_customer_reservations(wa_id)
        if not resp.get("success", False):
            return resp
        upcoming_reservations = resp.get("data", [])
        # Filter to only include future reservations
        upcoming_reservations = [res for res in upcoming_reservations if res["is_future"]]
        
        # Check if there's exactly one upcoming reservation
        if len(upcoming_reservations) == 0:
            return format_response(False, message=get_message("no_future_reservations", ar))
            
        # If multiple upcoming reservations, return error
        if len(upcoming_reservations) > 1:
            # Format reservations for message
            if ar:
                reservations_arg = ""
                for res in upcoming_reservations:
                    res_type = "كشف" if res["type"] == 0 else "مراجعة"
                    reservations_arg += f"\n- {res['date']} في {res['time_slot']} ({res_type})"
            else:
                reservations_arg = str(upcoming_reservations)
            return format_response(False, message=get_message("multiple_future_reservations", ar, reservations=reservations_arg))
            
        # Now we have exactly one upcoming reservation to modify
        existing_reservation = upcoming_reservations[0]
        existing_date = existing_reservation["date"]
        existing_time_slot = existing_reservation["time_slot"]
        
        # Initialize with existing values
        parsed_date_str = existing_date
        parsed_time_str = existing_time_slot
        
        # Parse and validate date/time in a single step (ensures no past)
        valid, err_msg, pd_normalized, pt_normalized = is_valid_date_time(new_date, new_time_slot, hijri)
        if not valid:
            return format_response(False, message=err_msg)
        parsed_date_str = pd_normalized
        parsed_time_str = pt_normalized
        
        # Get available time slots and validate the selected time
        if new_time_slot:
            # Convert back to 12-hour format for display and validation with available slots
            display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)
            
            # Retrieve and unpack available slots
            resp_slots = get_available_time_slots(parsed_date_str, max_reservations, hijri=False)
            if not resp_slots.get("success", False):
                return resp_slots
            available_slots = resp_slots.get("data", [])
            
            # Convert the list of available slots to a set for faster lookups
            available_slots_set = set(available_slots)
            
            if display_time_slot not in available_slots_set:
                if approximate:
                    # Find nearest slot by absolute clock-time difference
                    target_24h = normalize_time_format(display_time_slot, to_24h=True)
                    th, tm = map(int, target_24h.split(':'))
                    target_minutes = th * 60 + tm
                    best_slot, best_diff = None, None
                    for slot in available_slots:
                        slot_24h = normalize_time_format(slot, to_24h=True)
                        h, m = map(int, slot_24h.split(':'))
                        diff = abs(h * 60 + m - target_minutes)
                        if best_diff is None or diff < best_diff:
                            best_diff, best_slot = diff, slot
                    if best_slot is None:
                        message = "لم يتم العثور على موعد متاح للتقريب." if ar else "No available time slot found for approximation."
                        return format_response(False, message=message)
                    parsed_time_str = normalize_time_format(best_slot, to_24h=True)
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
        if not update_values:
            if ar:
                message = "لم يتم إجراء أي تغييرات كونه لم يتم تقديم تفاصيل جديدة."
            else:
                message = "No changes were made as no new details were provided."
            result = {"success": True, "message": message}
            return result
            
        # Update reservation using safe DB handling
        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Lock DB for write to enforce atomic capacity check + update
            cursor.execute("BEGIN IMMEDIATE")
            # Capacity check
            cursor.execute(
                "SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ? AND wa_id != ?",
                (parsed_date_str, parsed_time_str, wa_id)
            )
            if cursor.fetchone()[0] >= max_reservations:
                conn.rollback()
                msg = "This time slot is fully booked. Please choose another."
                if ar:
                    msg = "هذا الوقت محجوز بالكامل. يرجى اختيار وقت آخر."
                return format_response(False, message=get_message("slot_fully_booked", ar))

            # Only update future reservations
            curr_date = now.strftime("%Y-%m-%d")
            curr_time = now.strftime("%H:%M")
            update_values.extend([wa_id, curr_date, curr_date, curr_time])
            where_clause = "wa_id = ? AND (date > ? OR (date = ? AND time_slot >= ?))"
            update_query = f"UPDATE reservations SET {', '.join(update_fields)} WHERE {where_clause}"
            cursor.execute(update_query, update_values)
            conn.commit()
        finally:
            conn.close()
        # Standardize success response
        return format_response(True, message=get_message("reservation_modified", ar))

    except Exception as e:
        message = f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."
        if ar:
            message = "حدث خطأ في النظام. اطلب من المستخدم الاتصال بالسكرتيرة للحجز."
        result = format_response(False, message=message)
        logging.error(f"Function call modify_reservation failed, error: {e}")
        return result

def get_customer_reservations(wa_id, slot_duration=2, include_past=False):
    """
    Get the list of all reservations for the given WhatsApp ID.
    
    This function retrieves all reservations for a customer, marking each as future or past.
    A reservation is considered "future" if its date is after the current date,
    or if it's on the current date but its time slot is more than slot_duration hours from now.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer to retrieve reservations for
        slot_duration (int, optional): Number of hours before a reservation to consider it in the future.
                                       Defaults to 2 hours.
        include_past (bool, optional): If True, includes past reservations in the result.
                                       If False, only returns future reservations. Defaults to False.
        
    Returns:
        list: List of reservation dictionaries, each containing:
            - date (str): Reservation date in YYYY-MM-DD format
            - time_slot (str): Time slot (stored in 24-hour format)
            - customer_name (str): Name of the customer
            - type (int): Reservation type (0 for Check-Up, 1 for Follow-Up)
            - is_future (bool): Flag indicating if the reservation is in the future
            
        On error or invalid WhatsApp ID:
            dict: Contains error information with:
                - success (bool): False
                - message (str): Error message
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
    """
    is_valid_wa_id = is_valid_number(wa_id)
    if is_valid_wa_id != True:
        return is_valid_wa_id
    try:
        now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        current_date = now.strftime("%Y-%m-%d")
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT date, time_slot, customer_name, type FROM reservations WHERE wa_id = ?",
                (wa_id,)
            )
            rows = cursor.fetchall()
        finally:
            conn.close()
        
        reservation_list = []
        for row in rows:
            row_dict = dict(row)
            
            # Check if the reservation is in the future
            if row_dict["date"] > current_date:
                # Future date
                row_dict["is_future"] = True
            elif row_dict["date"] == current_date:
                # Same date, check time
                # Convert time_slot to datetime for comparison
                time_slot_24h = normalize_time_format(row_dict["time_slot"], to_24h=True)
                slot_time = datetime.datetime.strptime(time_slot_24h, "%H:%M").time()
                slot_datetime = datetime.datetime.combine(now.date(), slot_time, tzinfo=ZoneInfo("Asia/Riyadh"))
                
                # Reservation is in the future if it's more than slot_duration hours from now
                time_diff = (slot_datetime - now).total_seconds() / 3600  # difference in hours
                row_dict["is_future"] = time_diff > slot_duration
            else:
                # Past date
                row_dict["is_future"] = False
                
            # Include past reservations if the flag is set
            if include_past or row_dict["is_future"]:
                reservation_list.append(row_dict)
            
        # Standardize success response returning list of reservations
        return format_response(True, data=reservation_list)
    except Exception as e:
        logging.error(f"Function call get_customer_reservations failed, error: {e}")
        return format_response(False, message="System error occurred. Ask user to contact the secretary to reserve.")

def reserve_time_slot(wa_id, customer_name, date_str, time_slot, reservation_type, hijri=False, max_reservations=5, ar=False):
    """
    Reserve a time slot for a customer.
    
    This function creates a new reservation or modifies an existing one if the customer
    already has a future reservation. It handles both Hijri and Gregorian date formats,
    as well as 12-hour and 24-hour time formats. All dates are stored internally in 
    YYYY-MM-DD (Gregorian) format, and times are stored in 24-hour format.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer
        customer_name (str): Customer's name
        date_str (str): Date string (in either Hijri or Gregorian format)
        time_slot (str): Desired time slot (in either 12-hour or 24-hour format)
        reservation_type (int): Type of reservation (0 for Check-Up, 1 for Follow-Up)
        hijri (bool, optional): If True, treats the input date as Hijri. Defaults to False.
        max_reservations (int, optional): Maximum allowed reservations per time slot. Defaults to 5.
        ar (bool, optional): If True, returns error messages in Arabic. Defaults to False.
    
    Returns:
        dict: On success, contains:
            - success (bool): True
            - gregorian_date (str): Reserved date in Gregorian YYYY-MM-DD format
            - hijri_date (str): Reserved date in Hijri YYYY-MM-DD format
            - time_slot (str): Reserved time slot in 12-hour format
            - type (int): Reservation type (0 for Check-Up, 1 for Follow-Up)
            - message (str): Success message
            
        On failure, contains:
            - success (bool): False
            - message (str): Error message in English or Arabic based on 'ar' parameter
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
    """
    is_valid_wa_id = is_valid_number(wa_id, ar)
    if is_valid_wa_id != True:
        return is_valid_wa_id
    
    if not customer_name:
        return format_response(False, message=get_message("customer_name_required", ar))
    customer_name = fix_unicode_sequence(customer_name)
    
    # Validate reservation type
    is_valid, error_result, parsed_type = validate_reservation_type(reservation_type, ar)
    if not is_valid:
        return error_result
    
    # Store the validated type
    reservation_type = parsed_type

    try:        
        # Parse and validate date/time in a single step (ensures no past)
        valid, err_msg, parsed_date_str, parsed_time_str = is_valid_date_time(date_str, time_slot, hijri)
        if not valid:
            return format_response(False, message=err_msg)
        
        # Convert Gregorian to Hijri for output purposes
        hijri_date_obj = convert.Gregorian(*map(int, parsed_date_str.split('-'))).to_hijri()
        hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"

        # Get 12-hour format time for display and validation
        display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)

        # Retrieve and unpack available slots
        resp_slots = get_available_time_slots(parsed_date_str, max_reservations, hijri=False)
        if not resp_slots.get("success", False):
            return resp_slots
        available_slots = resp_slots.get("data", [])

        if display_time_slot not in available_slots:
            if ar:
                message = f"فشل الحجز. الوقت الذي تم اختياره ({display_time_slot}) غير متاح. الأوقات المتاحة: {', '.join(available_slots)}"
            else:
                message = f"Reservation failed. The selected time slot ({display_time_slot}) is not available. Available slots: {', '.join(available_slots)}"
            result = {"success": False, "message": message}
            return result

        # Retrieve and unpack existing reservations
        resp_exist = get_customer_reservations(wa_id)
        if not resp_exist.get("success", False):
            return resp_exist
        existing_reservations = resp_exist.get("data", [])
        if existing_reservations and any(res["is_future"] for res in existing_reservations):
            # modify the existing reservation
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

        # Reserve new time slot in a write-locked transaction
        make_thread(wa_id)
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("BEGIN IMMEDIATE")
            # Capacity check
            cursor.execute(
                "SELECT COUNT(*) FROM reservations WHERE date = ? AND time_slot = ?",
                (parsed_date_str, parsed_time_str)
            )
            if cursor.fetchone()[0] >= max_reservations:
                conn.rollback()
                return format_response(False, message=get_message("slot_fully_booked", ar))

            # Insert the new reservation
            cursor.execute(
                "INSERT INTO reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
                (wa_id, customer_name, parsed_date_str, parsed_time_str, reservation_type)
            )
            conn.commit()
            return format_response(True, data={
                "gregorian_date": parsed_date_str,
                "hijri_date": hijri_date_str,
                "time_slot": display_time_slot,
                "type": reservation_type
            }, message=get_message("reservation_successful", ar))
        except sqlite3.OperationalError as e:
            conn.rollback()
            logging.error(f"reserve_time_slot DB error: {e}")
            return format_response(False, message=get_message("system_error_try_later", ar))
        finally:
            conn.close()

    except Exception as e:
        message = f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve."
        if ar:
            message = "حدث خطأ في النظام. اطلب من المستخدم الاتصال بالسكرتيرة للحجز."
        result = format_response(False, message=message)
        logging.error(f"Function call reserve_time_slot failed, error: {e}")
        return result

def cancel_reservation(wa_id, date_str=None, hijri=False, ar=False):
    """
    Cancel a reservation or all reservations for a customer.
    
    This function performs a soft delete by moving the reservation(s) to the 'cancelled_reservations'
    table before removing them from the active 'reservations' table. This preserves reservation
    history while freeing up the time slot.
    
    If date_str is provided, only reservations on that date are cancelled.
    If date_str is not provided, all of the customer's reservations are cancelled.
    
    Parameters:
        wa_id (str): WhatsApp ID of the customer whose reservation(s) should be cancelled
        date_str (str, optional): Date of the reservation in Hijri or Gregorian format.
                                 If not provided, all reservations are cancelled.
        hijri (bool, optional): Flag indicating if the provided date is in Hijri format.
                               Defaults to False.
        ar (bool, optional): If True, returns messages in Arabic. Defaults to False.
        
    Returns:
        dict: Result of the cancellation operation with:
            - success (bool): True if cancellation was successful, False otherwise
            - message (str): Human-readable status message in English or Arabic based on 'ar' parameter
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
    """
    try:
        is_valid_wa_id = is_valid_number(wa_id, ar)
        if is_valid_wa_id != True:
            return is_valid_wa_id
            
        # Retrieve and unpack upcoming reservations
        resp_up = get_customer_reservations(wa_id)
        if not resp_up.get("success", False):
            return resp_up
        upcoming_reservations = resp_up.get("data", [])
        # Check if there are any reservations
        if not upcoming_reservations:
            return format_response(False, message=get_message("no_reservations_found", ar))
            
        # Process date if provided
        parsed_date_str = None
        if date_str:
            try:
                parsed_date_str = parse_date(date_str, hijri=hijri)
            except Exception:
                return format_response(False, message=get_message("invalid_date", ar))
                
        # Filter reservations by date if specified
        reservations_to_cancel = []
        if parsed_date_str is not None:
            for res in upcoming_reservations:
                if res["date"] == parsed_date_str:
                    reservations_to_cancel.append(res)
            
            if not reservations_to_cancel:
                return format_response(False, message=get_message("reservation_not_found", ar))
        else:
            # Cancel all reservations
            reservations_to_cancel = upcoming_reservations
                
        conn = get_connection()
        cursor = conn.cursor()
        
        # Move to cancelled_reservations
        for res in reservations_to_cancel:
            res["wa_id"] = wa_id
        cursor.executemany(
            "INSERT INTO cancelled_reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
            [(res["wa_id"], res["customer_name"], res["date"], res["time_slot"], res["type"]) for res in reservations_to_cancel]
        )
        
        # Delete from active reservations
        if parsed_date_str is None:
            cursor.execute("DELETE FROM reservations WHERE wa_id = ?", (wa_id,))
            msg = "All reservations cancelled."
            if ar:
                msg = "تم إلغاء جميع الحجوزات."
        else:
            cursor.execute(
                "DELETE FROM reservations WHERE wa_id = ? AND date = ?",
                (wa_id, parsed_date_str)
            )
            msg = "Reservation cancelled."
            if ar:
                msg = "تم إلغاء الحجز."
                
        conn.commit()
        conn.close()
        
        # Standardize success response
        return format_response(True, message=get_message("all_reservations_cancelled" if parsed_date_str is None else "reservation_cancelled", ar))

    except Exception as e:
        message = f"System error occurred: {str(e)}."
        if ar:
            message = "حدث خطأ في النظام."
        result = format_response(False, message=message)
        logging.error(f"Function call cancel_reservation failed, error: {e}")
        return result

def get_available_time_slots(date_str, max_reservations=5, hijri=False):
    """
    Get the available time slots for a given date.
    
    This function retrieves all available time slots for a specified date, considering:
    - Vacation periods (slots are unavailable during vacation periods)
    - Past dates (no slots available for past dates)
    - Current reservations (only returns slots with fewer than max_reservations)
    
    The function handles both Hijri and Gregorian date formats, converting all dates
    to Gregorian format internally.
    
    Parameters:
        date_str (str): Date string to get available time slots for.
                       If 'hijri' is True, accepts Hijri formats such as:
                       '1447-09-10', '10 Muharram 1447', or '10, Muharram, 1447'.
                       Otherwise, expects Gregorian date formats like 'YYYY-MM-DD'.
        max_reservations (int, optional): Maximum number of reservations allowed per time slot.
                                         Defaults to 5.
        hijri (bool, optional): Flag indicating if the provided date string is in Hijri format.
                               Defaults to False.
        
    Returns:
        list: List of available time slots in 12-hour format (for display)
        
        On error:
            dict: Contains error information with:
                - success (bool): False
                - message (str): Error message describing the issue
    
    Raises:
        Exception: Catches and logs any exceptions, returning a formatted error message
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
        all_slots = get_time_slots(date_str=parsed_date_str)
        
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

        conn = get_connection()
        cursor = conn.cursor()
        try:
            # Format query placeholders for the IN clause - include both 12h and 24h formats
            all_possible_formats = list(time_format_map.keys()) + list(time_format_map.values())
            placeholders = ', '.join(['?'] * len(all_possible_formats))
            if placeholders:  # Only query if there are time slots
                cursor.execute(
                    f"SELECT time_slot, COUNT(*) as count FROM reservations WHERE date = ? AND time_slot IN ({placeholders}) GROUP BY time_slot",
                    [parsed_date_str] + all_possible_formats
                )
                rows = cursor.fetchall()
                # Process results, handling both 12-hour and 24-hour formats
                if rows:
                    for row in rows:
                        db_time_slot = row["time_slot"]
                        count = row["count"]
                        if db_time_slot in reverse_map:
                            display_time_slot = reverse_map[db_time_slot]
                            if display_time_slot in all_slots:
                                all_slots[display_time_slot] += count
                        elif db_time_slot in all_slots:
                            all_slots[db_time_slot] += count
        finally:
            conn.close()
        
        # Return only slots with availability (in 12-hour format for display)
        result = [ts for ts, count in all_slots.items() if count < max_reservations]
        # Standardize success response returning available slots
        return format_response(True, data=result)
    except Exception as e:
        logging.error(f"Function call get_available_time_slots failed, error: {e}")
        return format_response(False, message=f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve.")

def search_available_appointments(start_date=None, time_slot=None, days_forward=7, days_backward=0, max_reservations=5, hijri=False):
    """
    Search for available appointment slots across a range of dates.
    
    This function searches for available appointment slots within a specified date range,
    with two different modes of operation:
    
    1. With time_slot specified: Finds the closest available time to the requested time
       on each date in the range.
    2. Without time_slot specified: Returns all available time slots for each date in the default range (7 days forward and 0 days backward).
    
    The function handles vacation periods, past dates, and checks reservation counts against
    max_reservations. It can work with both Hijri and Gregorian calendars.
    
    Parameters:
        start_date (str or datetime.date, optional): The date to start searching from.
                                                    If string, format should be YYYY-MM-DD.
                                                    If None, defaults to today.
        time_slot (str, optional): The time slot to search for (12-hour or 24-hour format).
                                  If None, returns all available time slots for each date.
        days_forward (int, optional): Number of days to search ahead. Defaults to 7.
        days_backward (int, optional): Number of days to search in the past. Defaults to 0.
                                      (Past dates will still be filtered out)
        max_reservations (int, optional): Maximum allowed reservations per time slot.
                                         Defaults to 5.
        hijri (bool, optional): If True, treats input date as Hijri and outputs Hijri dates.
                               Defaults to False.
    
    Returns:
        If time_slot is provided:
            list: List of dictionaries with available dates and closest matching times:
                 [
                    {
                        "date": str,             # Date in requested format (Hijri or Gregorian)
                        "time_slot": str,        # Time slot in 12-hour format
                        "time_slot_24h": str,    # Time slot in 24-hour format 
                        "is_exact": bool         # True if exact requested time is available
                    },
                    ...
                 ]
                 
        If time_slot is None:
            list: List of dictionaries with dates and all available time slots:
                 [
                    {
                        "date": str,             # Date in requested format (Hijri or Gregorian)
                        "time_slots": [
                            {
                                "time_slot": str  # Available time slot in 12-hour format
                            },
                            ...
                        ]
                    },
                    ...
                 ]
                 
        On error:
            dict: Contains error information with:
                - success (bool): False
                - message (str): Error message
    
    Raises:
        ValueError: If start_date is not a string or datetime.date object
        Exception: Catches and logs any other exceptions, returning a formatted error message
    """
    try:
        # Initialize variables for time slot comparison
        requested_time = None
        requested_minutes = None
        display_time_slot = None
        
        # Parse the requested time slot if provided
        if time_slot is not None:
            parsed_time_str = normalize_time_format(time_slot, to_24h=True)
            requested_time = datetime.datetime.strptime(parsed_time_str, "%H:%M")
            requested_minutes = requested_time.hour * 60 + requested_time.minute
            display_time_slot = normalize_time_format(parsed_time_str, to_24h=False)
        
        available_dates = []
        date_slots_map = {}  # For grouping slots by date when no time_slot is provided
        
        # Get current date/time in Asia/Riyadh timezone
        today = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
        
        # Use provided start_date if available, otherwise use today
        if start_date:
            if isinstance(start_date, str):
                try:
                    # Use parse_date which handles both Gregorian and Hijri dates
                    parsed_date_str = parse_date(start_date, hijri=hijri)
                    start_date = datetime.datetime.strptime(parsed_date_str, "%Y-%m-%d").date()
                except Exception as e:
                    logging.error(f"Error parsing start date: {e}")
                    # Fall back to today if parsing fails
                    start_date = today.date()
            elif isinstance(start_date, datetime.date):
                # Already a date object, no conversion needed
                pass
            else:
                raise ValueError("start_date must be a string (YYYY-MM-DD) or datetime.date object")
            
            # Create a datetime object at the start of the day in Riyadh timezone
            today = datetime.datetime.combine(start_date, datetime.time.min, tzinfo=ZoneInfo("Asia/Riyadh"))
        
        now = today.date()
        conn = get_connection()
        cursor = conn.cursor()

        # Include today in the search
        date_range = list(range(-days_backward, days_forward + 1))
        
        for day_offset in date_range:
            date_obj = today + datetime.timedelta(days=day_offset)
            gregorian_date_str = date_obj.strftime("%Y-%m-%d")
            date_day = date_obj.date()
            
            # Skip dates in the past
            if date_day < now:
                continue
                
            # Skip dates during vacation
            is_vacation, _ = is_vacation_period(date_day)
            if is_vacation:
                continue
            
            # Convert Gregorian to Hijri for output if requested
            hijri_date_str = None
            if hijri:
                hijri_date_obj = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
                hijri_date_str = f"{hijri_date_obj.year}-{hijri_date_obj.month:02d}-{hijri_date_obj.day:02d}"
            
            # Date string for display - Hijri or Gregorian based on parameter
            display_date_str = hijri_date_str if hijri else gregorian_date_str
            
            # If no specific time slot is requested, get all available time slots for this date
            if time_slot is None:
                result = get_available_time_slots(gregorian_date_str, max_reservations, hijri=False)
                # Skip if error response
                if isinstance(result, dict) and result.get("success") is False:
                    continue
                # Extract list of slots
                if isinstance(result, dict) and "data" in result:
                    available_slots = result.get("data") or []
                else:
                    available_slots = result or []
                if not available_slots:
                    continue

                # Group slots by date
                if display_date_str not in date_slots_map:
                    date_slots_map[display_date_str] = []

                # Add each available slot for this date
                for slot in available_slots:
                    # Always store 24-hour format internally, but display in 12-hour format
                    slot_24h = normalize_time_format(slot, to_24h=True)
                    slot_12h = normalize_time_format(slot_24h, to_24h=False)
                    
                    date_slots_map[display_date_str].append({
                        "time_slot": slot_12h,
                    })
                
                continue  # Move to the next date
            
            # For specific time slot requests, continue with the existing logic
            # Get all slots for this date with past filtering for today
            all_slots = get_time_slots(date_str=gregorian_date_str)
            
            # Skip if get_time_slots returned an error (vacation or parsing)
            if isinstance(all_slots, dict) and all_slots.get("success") is False:
                continue
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
            # Ensure 12-hour format for display
            closest_slot_12h = normalize_time_format(closest_slot_24h, to_24h=False)
            
            # Check reservation count for the closest slot
            cursor.execute(
                "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND time_slot = ?",
                (gregorian_date_str, closest_slot_24h)
            )
            row = cursor.fetchone()
            count = row["count"] if row else 0
            
            # Add date if the slot has availability
            if count < max_reservations:
                date_entry = {
                    "date": display_date_str,
                    "time_slot": closest_slot_12h,  # Use 12-hour format for display
                    "time_slot_24h": closest_slot_24h,  # Include 24-hour format for reference
                    "is_exact": is_exact
                }
                
                available_dates.append(date_entry)
        
        conn.close()
        
        # If no time_slot was provided, convert the grouped map to a list
        if time_slot is None and date_slots_map:
            for date_str, slots in date_slots_map.items():
                available_dates.append({
                    "date": date_str,
                    "time_slots": slots
                })
        
        # Standardize success response
        return format_response(True, data=available_dates)
    
    except ValueError as ve:
        result = {"success": False, "message": f"Invalid format: {str(ve)}"}
        return result
    except Exception as e:
        logging.error(f"Function call search_available_appointments failed, error: {e}")
        return format_response(False, message=f"System error occurred: {str(e)}. Ask user to contact the secretary to reserve.")
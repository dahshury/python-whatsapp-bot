import os
import requests
import datetime

# Use Docker service name directly - this works for container-to-container communication
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")

# WhatsApp messaging operations

def send_whatsapp_message(wa_id, text):
    r = requests.post(
        f"{BACKEND_URL}/whatsapp/message", json={"wa_id": wa_id, "text": text}
    )
    r.raise_for_status()
    return r.json()


def send_whatsapp_location(wa_id, latitude, longitude, name="", address=""):
    payload = {
        "wa_id": wa_id,
        "latitude": latitude,
        "longitude": longitude,
        "name": name,
        "address": address,
    }
    r = requests.post(f"{BACKEND_URL}/whatsapp/location", json=payload)
    r.raise_for_status()
    return r.json()


def send_whatsapp_template(wa_id, template_name, language="en_US", components=None):
    payload = {
        "wa_id": wa_id,
        "template_name": template_name,
        "language": language,
    }
    if components is not None:
        payload["components"] = components
    r = requests.post(f"{BACKEND_URL}/whatsapp/template", json=payload)
    r.raise_for_status()
    return r.json()

# Conversation operations

def get_all_conversations(recent=None, limit=0):
    params = {}
    if recent is not None:
        params["recent"] = recent
    if limit:
        params["limit"] = limit
    r = requests.get(f"{BACKEND_URL}/conversations", params=params)
    r.raise_for_status()
    return r.json()


def append_message(wa_id, role, message, date, time):
    payload = {"role": role, "message": message, "date": date, "time": time}
    r = requests.post(f"{BACKEND_URL}/conversations/{wa_id}", json=payload)
    r.raise_for_status()
    return r.json()

# Reservation operations

def get_all_reservations(future=True, include_cancelled=False):
    params = {"future": future, "include_cancelled": include_cancelled}
    r = requests.get(f"{BACKEND_URL}/reservations", params=params)
    r.raise_for_status()
    return r.json()


def reserve_time_slot(wa_id, customer_name, date_str, time_slot, reservation_type, hijri=False, ar=False, max_reservations=5):
    payload = {
        "wa_id": wa_id,
        "customer_name": customer_name,
        "date_str": date_str,
        "time_slot": time_slot,
        "reservation_type": reservation_type,
        "hijri": hijri,
        "ar": ar,
        "max_reservations": max_reservations
    }
    r = requests.post(f"{BACKEND_URL}/reservations", json=payload)
    r.raise_for_status()
    return r.json()


def cancel_reservation(wa_id, date_str=None, hijri=False, ar=False):
    payload = {"date_str": date_str, "hijri": hijri, "ar": ar}
    r = requests.post(f"{BACKEND_URL}/reservations/{wa_id}/cancel", json=payload)
    r.raise_for_status()
    return r.json()


def modify_reservation(wa_id, new_date=None, new_time_slot=None, new_name=None, new_type=None, hijri=False, ar=False):
    payload = {
        "new_date": new_date,
        "new_time_slot": new_time_slot,
        "new_name": new_name,
        "new_type": new_type,
        "hijri": hijri,
        "ar": ar,
    }
    r = requests.post(f"{BACKEND_URL}/reservations/{wa_id}/modify", json=payload)
    r.raise_for_status()
    return r.json()


def modify_id(old_wa_id, new_wa_id, ar=False):
    payload = {"old_wa_id": old_wa_id, "new_wa_id": new_wa_id, "ar": ar}
    r = requests.post(f"{BACKEND_URL}/reservations/{old_wa_id}/modify_id", json=payload)
    r.raise_for_status()
    return r.json()

# Date/time helpers for front-end calendar

def parse_date(date_str):
    # assume incoming date_str is ISO format 'YYYY-MM-DD'
    return date_str


def parse_time(time_str, to_24h=True):
    """
    Parse time strings in various formats.
    
    Args:
        time_str (str): The time string to parse
        to_24h (bool): Whether to convert to 24-hour format
        
    Returns:
        str: Normalized time string in the requested format
    """
    if not time_str:
        return ""
    
    try:
        # Handle 12-hour format with AM/PM
        if "AM" in time_str.upper() or "PM" in time_str.upper():
            # Try different 12-hour formats
            try:
                # With seconds (e.g., "01:30:00 PM")
                time_obj = datetime.datetime.strptime(time_str, "%I:%M:%S %p")
            except ValueError:
                try:
                    # Without seconds (e.g., "01:30 PM")
                    time_obj = datetime.datetime.strptime(time_str, "%I:%M %p")
                except ValueError:
                    # Fallback for other formats
                    time_parts = time_str.upper().replace("AM", " AM").replace("PM", " PM").split()
                    if len(time_parts) != 2:
                        raise ValueError(f"Invalid time format: {time_str}")
                    
                    time_part = time_parts[0]
                    am_pm = time_parts[1]
                    
                    # Parse the time part
                    if ":" in time_part:
                        parts = time_part.split(":")
                        hour = int(parts[0])
                        minute = int(parts[1]) if len(parts) > 1 else 0
                        
                        # Adjust hour for PM
                        if am_pm == "PM" and hour < 12:
                            hour += 12
                        # Adjust 12 AM to 0
                        if am_pm == "AM" and hour == 12:
                            hour = 0
                        
                        time_obj = datetime.datetime(2000, 1, 1, hour, minute)
                    else:
                        raise ValueError(f"Invalid time format: {time_str}")
        else:
            # Handle 24-hour format
            if ":" in time_str:
                parts = time_str.split(":")
                if len(parts) == 3:
                    # HH:MM:SS
                    time_obj = datetime.datetime.strptime(time_str, "%H:%M:%S")
                else:
                    # HH:MM
                    time_obj = datetime.datetime.strptime(time_str, "%H:%M")
            else:
                raise ValueError(f"Invalid time format: {time_str}")
        
        # Return in requested format
        if to_24h:
            return time_obj.strftime("%H:%M")
        else:
            return time_obj.strftime("%I:%M %p")
    
    except Exception as e:
        # If all parsing attempts fail, return original with warning
        print(f"Warning: Could not parse time '{time_str}': {e}")
        return time_str 
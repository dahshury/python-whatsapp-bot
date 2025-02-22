import datetime
from zoneinfo import ZoneInfo
import shelve
import json
from hijri_converter import convert

def get_current_time():
    """
    Get the current time in both Hijri and Gregorian calendars.
    Returns a formatted string with both date and time.
    """
    now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
    gregorian_date_str = now.strftime("%Y-%m-%d")
    gregorian_time_str = now.strftime("%H:%M")
    
    hijri_date = convert.Gregorian(now.year, now.month, now.day).to_hijri()
    hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
    
    return json.dumps({
        "gregorian_date": gregorian_date_str,
        "makkah_time": gregorian_time_str,
        "hijri_date": hijri_date_str
    })
    
def get_customer_reservations(wa_id):
    """
    Get the list of reservations for the given WhatsApp ID.
    """
    with shelve.open("threads_db") as threads_shelf:
        if wa_id in threads_shelf:
            return json.dumps(threads_shelf[wa_id].get('reservations', []))
        return json.dumps({})
    
def get_time_slots(date_str):
    # Define working hours based on the day of the week and whether it's Ramadan
    date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d")
    day_of_week = date_obj.weekday()

    # Check if the date falls within Ramadan
    hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
    is_ramadan = hijri_date.month == 9

    if day_of_week == 4:  # Friday
        return []  # Clinic is closed on Fridays
    elif is_ramadan:
        available = {f"{hour:02d}:00": 0 for hour in range(10, 16)}  # 10 AM to 4 PM during Ramadan
    elif day_of_week == 5:  # Saturday
        available = {f"{hour:02d}:00": 0 for hour in range(17, 22, 2)}  # 5 PM to 10 PM
    else:  # Sunday to Thursday
        available = {f"{hour:02d}:00": 0 for hour in range(11, 18, 2)}  # 11 AM to 5 PM
    
    return available

def reserve_time_slot(wa_id, date_str, time_slot):
    """
    Reserve a time slot for the given WhatsApp ID.
    """
    available = get_time_slots(date_str)
    
    if time_slot not in available:
        return json.dumps({"success": False, "message": "Invalid time slot."})
    
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        if wa_id in threads_shelf:
            threads_shelf[wa_id]['reservations'].append({
                'date': date_str,
                'time_slot': time_slot
            })
        else:
            threads_shelf[wa_id] = {
                'thread_id': None,
                'conversation': [],
                'reservations': [{
                    'date': date_str,
                    'time_slot': time_slot
                }]
            }
        threads_shelf.sync()
        return json.dumps({"success": True})

def cancel_reservation(wa_id, date_str, time_slot):
    """
    Cancel a time slot reservation for the given WhatsApp ID.
    """
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        if wa_id in threads_shelf:
            for reservation in threads_shelf[wa_id]['reservations']:
                if reservation['date'] == date_str and reservation['time_slot'] == time_slot:
                    threads_shelf[wa_id]['reservations'].remove(reservation)
                    threads_shelf.sync()
                    return json.dumps({"exists_and_removed": True})
        return json.dumps({"exists": False})

def get_available_time_slots(date_str, max_reservations=5, hijri=False):
    """
    Get the list of available time slots for the given date.
    """
    if hijri:
        hijri_date = convert.Hijri(*map(int, date_str.split('-'))).to_gregorian()
        date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
    
    available = get_time_slots(date_str)
        
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        for wa_id in threads_shelf:
            for reservation in threads_shelf[wa_id]['reservations']:
                if reservation['date'] == date_str:
                    time_slot = reservation['time_slot']
                    if time_slot in available:
                        available[time_slot] += 1

    # Return time slots with reservations less than max_reservations
    return json.dumps({time_slot: count for time_slot, count in available.items() if count < max_reservations})

def get_available_nearby_dates_for_time_slot(time_slot, days_forward=7, days_backward=0, max_reservations=5, hijri=False):
    """
    Get the list of available dates for the given time slot within a range of days.
    """
    available_dates = []
    today = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
    
    # Check backward days
    for days_behind in range(1, days_backward + 1):
        date_obj = today - datetime.timedelta(days=days_behind)
        date_str = date_obj.strftime("%Y-%m-%d")
        available = get_time_slots(date_str)
        if time_slot in available and available[time_slot] < max_reservations:
            available_dates.append(date_str)
    
    # Check forward days
    for days_ahead in range(1, days_forward + 1):
        date_obj = today + datetime.timedelta(days=days_ahead)
        date_str = date_obj.strftime("%Y-%m-%d")
        available = get_time_slots(date_str)
        if time_slot in available and available[time_slot] < max_reservations:
            available_dates.append(date_str)
    
    # Convert all dates to Hijri if required
    if hijri:
        hijri_dates = []
        for date_str in available_dates:
            date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
            hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
            hijri_dates.append(hijri_date_str)
        return json.dumps(hijri_dates)
    
    return json.dumps(available_dates)
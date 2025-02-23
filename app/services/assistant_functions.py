import json
from app.db import get_connection
from zoneinfo import ZoneInfo
import datetime
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
    
    day_name = now.strftime("%a")
    return json.dumps({
        "gregorian_date": gregorian_date_str,
        "makkah_time": gregorian_time_str,
        "hijri_date": hijri_date_str,
        "day_name": day_name
    })
def get_customer_reservations(wa_id):
    """
    Get the list of reservations for the given WhatsApp ID from SQLite.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT date, time_slot, customer_name FROM reservations WHERE wa_id = ?", (wa_id,))
    rows = cursor.fetchall()
    conn.close()
    reservation_list = [dict(row) for row in rows]
    return json.dumps(reservation_list)
    
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
    return json.dumps(available)

def reserve_time_slot(wa_id, customer_name, date_str, time_slot):
    available = json.loads(get_time_slots(date_str))
    if time_slot not in available:
        return json.dumps({"success": False, "message": "Invalid time slot."})
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if the user already has a reservation for the given date
    cursor.execute("SELECT COUNT(*) FROM reservations WHERE wa_id = ? AND date = ?", (wa_id, date_str))
    if cursor.fetchone()[0] > 0:
        conn.close()
        return json.dumps({"success": False, "message": "You already have a reservation for this date. Please cancel it first."})
    
    # Ensure a thread record exists (create one with thread_id=NULL if needed)
    cursor.execute("SELECT thread_id FROM threads WHERE wa_id = ?", (wa_id,))
    if cursor.fetchone() is None:
        cursor.execute("INSERT INTO threads (wa_id, thread_id) VALUES (?, ?)", (wa_id, None))
    
    # Insert the new reservation with customer name
    cursor.execute(
        "INSERT INTO reservations (wa_id, customer_name, date, time_slot) VALUES (?, ?, ?, ?)",
        (wa_id, customer_name, date_str, time_slot)
    )
    conn.commit()
    conn.close()
    return json.dumps({"success": True})

def cancel_reservation(wa_id, date_str, time_slot):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
        (wa_id, date_str, time_slot)
    )
    exists = cursor.fetchone()[0] > 0
    if not exists:
        conn.close()
        return json.dumps({"exists": False, "removed": False, "message": "Reservation not found."})
    
    cursor.execute(
        "DELETE FROM reservations WHERE wa_id = ? AND date = ? AND time_slot = ?",
        (wa_id, date_str, time_slot)
    )
    removed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return json.dumps({
        "exists": True,
        "removed": removed,
        "message": "Error occured. Please call secretary." if not removed else "Reservation removed."})

def get_available_time_slots(date_str, max_reservations=5, hijri=False):
    if hijri:
        hijri_date = convert.Hijri(*map(int, date_str.split('-'))).to_gregorian()
        date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
    
    available = json.loads(get_time_slots(date_str))
    
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT time_slot, COUNT(*) as count FROM reservations WHERE date = ? GROUP BY time_slot",
        (date_str,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    if rows:
        reservation_counts = {row["time_slot"]: row["count"] for row in rows}
        # Merge counts with available slots
        for time_slot in available.keys():
            if time_slot in reservation_counts:
                available[time_slot] += reservation_counts[time_slot]
    else:
        reservation_counts = {}
    
    return json.dumps([ts for ts, count in available.items() if count < max_reservations])

def get_available_nearby_dates_for_time_slot(time_slot, days_forward=7, days_backward=0, max_reservations=5, hijri=False):
    available_dates = []
    today = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
    conn = get_connection()
    cursor = conn.cursor()

    # Check backward days
    for days_behind in range(1, days_backward + 1):
        date_obj = today - datetime.timedelta(days=days_behind)
        date_str = date_obj.strftime("%Y-%m-%d")
        available = json.loads(get_time_slots(date_str))
        cursor.execute(
            "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND time_slot = ?",
            (date_str, time_slot)
        )
        row = cursor.fetchone()
        count = row["count"] if row else 0
        if time_slot in available and (available[time_slot] + count) < max_reservations:
            available_dates.append(date_str)
    
    # Check forward days
    for days_ahead in range(1, days_forward + 1):
        date_obj = today + datetime.timedelta(days=days_ahead)
        date_str = date_obj.strftime("%Y-%m-%d")
        available = json.loads(get_time_slots(date_str))
        cursor.execute(
            "SELECT COUNT(*) as count FROM reservations WHERE date = ? AND time_slot = ?",
            (date_str, time_slot)
        )
        row = cursor.fetchone()
        count = row["count"] if row else 0
        if time_slot in available and (available[time_slot] + count) < max_reservations:
            available_dates.append(date_str)
    
    conn.close()
    if hijri:
        hijri_dates = []
        for date_str in available_dates:
            date_obj = datetime.datetime.strptime(date_str, "%Y-%m-%d")
            hijri_date = convert.Gregorian(date_obj.year, date_obj.month, date_obj.day).to_hijri()
            hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
            hijri_dates.append(hijri_date_str)
        return json.dumps(hijri_dates)
    
    return json.dumps(available_dates)
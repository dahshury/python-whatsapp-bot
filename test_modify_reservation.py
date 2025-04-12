import logging
import sys
import datetime
from app.db import get_connection
from app.services.assistant_functions import modify_reservation, delete_reservation, get_customer_reservations, get_available_time_slots, search_available_appointments
from app.utils import is_valid_number, parse_date, normalize_time_format

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Test params
wa_id = "966530381035"  # An ID we know exists
customer_name = "Test Customer"
initial_date = "2025-05-01"
reservation_type = 0  # Check-up

# Validate the phone number
logging.info(f"Validating phone number: {wa_id}")
valid_number = is_valid_number(wa_id)
logging.info(f"Phone number valid: {valid_number}")

# First, delete all existing reservations
logging.info(f"Deleting all reservations for wa_id={wa_id}")
delete_result = delete_reservation(wa_id)
logging.info(f"Delete result: {delete_result}")

# Check available time slots for the initial date
logging.info(f"Checking available time slots for initial date: {initial_date}")
available_slots_initial = get_available_time_slots(initial_date)
logging.info(f"Available time slots for initial date: {available_slots_initial}")

if not available_slots_initial:
    logging.error(f"No available time slots for {initial_date}")
    sys.exit(1)

# Use the first available time slot
initial_time_slot = available_slots_initial[0]
logging.info(f"Using time slot: {initial_time_slot}")

# Insert directly to the database
try:
    logging.info("Inserting directly into database")
    conn = get_connection()
    cursor = conn.cursor()
    
    # Ensure thread exists
    cursor.execute("INSERT OR IGNORE INTO threads (wa_id, thread_id) VALUES (?, ?)", (wa_id, None))
    
    # Direct insert to reservations
    normalized_time = normalize_time_format(initial_time_slot, to_24h=True)
    cursor.execute(
        "INSERT INTO reservations (wa_id, customer_name, date, time_slot, type) VALUES (?, ?, ?, ?, ?)",
        (wa_id, customer_name, initial_date, normalized_time, reservation_type)
    )
    
    # Check if rows were affected
    rows_affected = cursor.rowcount
    logging.info(f"Direct DB insert affected {rows_affected} rows")
    
    conn.commit()
    conn.close()
except Exception as e:
    logging.error(f"Direct DB insert error: {str(e)}", exc_info=True)
    sys.exit(1)

# Check if reservation was created
reservations = get_customer_reservations(wa_id)
logging.info(f"Reservations after creation: {reservations}")

if not reservations or not isinstance(reservations, list) or len(reservations) == 0:
    logging.error("Failed to create reservation")
    sys.exit(1)

# Search for available dates in the next 30 days
logging.info("Searching for available dates in the next 30 days")
target_dates = search_available_appointments(start_date=initial_date, days_forward=30)
logging.info(f"Found {len(target_dates)} dates with availability")

# Find a date with available slots
new_date = None
new_time_slot = None

for date_entry in target_dates:
    if date_entry.get("date") != initial_date:  # Skip our initial date
        if "time_slots" in date_entry and date_entry["time_slots"]:
            new_date = date_entry["date"]
            new_time_slot = date_entry["time_slots"][0]["time_slot"]
            break

if not new_date or not new_time_slot:
    logging.error("Could not find any available dates for modification")
    sys.exit(1)

logging.info(f"Found available date: {new_date} with time slot: {new_time_slot}")

new_name = "Test Customer Modified"
new_type = 1  # Follow-up

logging.info(f"Modifying reservation with: wa_id={wa_id}, new_date={new_date}, new_time_slot={new_time_slot}")

try:
    modify_result = modify_reservation(
        wa_id=wa_id,
        new_date=new_date,
        new_time_slot=new_time_slot,
        new_name=new_name,
        new_type=new_type
    )
    
    logging.info(f"Modify result: {modify_result}")
    
    if modify_result.get("success"):
        logging.info("Modification successful")
    else:
        logging.error(f"Modification failed: {modify_result.get('message')}")
        
except Exception as e:
    logging.error(f"Exception occurred during modification: {str(e)}", exc_info=True)

# Check final state
reservations = get_customer_reservations(wa_id)
logging.info(f"Final reservations: {reservations}")

# Double check in the database
try:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reservations WHERE wa_id = ?", (wa_id,))
    rows = cursor.fetchall()
    conn.close()
    
    for row in rows:
        logging.info(f"DB row: {dict(row)}")
except Exception as e:
    logging.error(f"Error querying database: {str(e)}", exc_info=True) 
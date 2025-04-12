import logging
from app.services.assistant_functions import modify_reservation

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Test directly modifying an existing reservation (we know it exists from previous test)
wa_id = "966530381035"
new_name = "Modified Customer Name"
new_date = "2025-05-10"  # Same date to avoid availability issues
new_time_slot = "10:00 AM"  # Time slot we know already exists
new_type = 1  # Change type only

logging.info(f"Attempting to modify reservation for wa_id={wa_id}")
result = modify_reservation(
    wa_id=wa_id,
    new_name=new_name,
    new_type=new_type,
    # Not changing date or time to avoid availability issues
)

logging.info(f"Result: {result}")

if result.get("success"):
    logging.info("Modification successful")
else:
    logging.error(f"Modification failed: {result.get('message')}") 
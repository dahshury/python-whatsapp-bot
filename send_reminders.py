#!/usr/bin/env python3
# filepath: /home/ubuntu/python-whatsapp-bot/send_reminders.py
import os
import sys
import logging
import datetime
from dotenv import load_dotenv

# Configure logging to file
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/python-whatsapp-bot/send_reminders.log'),
        logging.StreamHandler()
    ]
)

# Set the correct path
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
sys.path.insert(0, script_dir)

# Load environment variables
load_dotenv(os.path.join(script_dir, '.env'))

# Now import app modules
from app.utils import send_whatsapp_message, get_tomorrow_reservations, append_message

def send_reminders():
    try:
        logging.info("Starting to send reminders")
        reservations = get_tomorrow_reservations()
        
        if not reservations:
            logging.info("No reservations found for tomorrow")
            return
            
        logging.info(f"Found {len(reservations)} reservations for tomorrow")
        
        for reservation in reservations:
            message = (
                f"نذكركم بأن لديكم حجز غدًا في {reservation['time_slot']}.\n"
                "نرجو التكرم بالحضور في موعد الحجز المحدد.\n"
                "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
                "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
            )
            
            logging.info(f"Sending reminder to {reservation['wa_id']}")
            send_whatsapp_message(reservation['wa_id'], message)
            
            datetime_obj = datetime.datetime.now()
            curr_date = datetime_obj.date().isoformat()
            curr_time = datetime_obj.strftime("%I:%M %p")
            
            append_message(reservation['wa_id'], "secretary", message, curr_date, curr_time)
            logging.info(f"Reminder sent to {reservation['wa_id']}")
            
        logging.info("All reminders sent successfully")
    except Exception as e:
        logging.error(f"Failed to send reminders: {e}", exc_info=True)
        
if __name__ == "__main__":
    send_reminders()
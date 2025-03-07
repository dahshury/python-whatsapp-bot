#!/usr/bin/env python3
from app.utils import send_whatsapp_message, get_tomorrow_reservations
import logging

def send_reminders():
    try:
        reservations = get_tomorrow_reservations()
        for reservation in reservations:
            message = (
                f"تذكير: لديك حجز غدًا في {reservation['time_slot']}.\n"
                "يجب الالتزام بالحضور في موعد الحجز المحدد.\n"
                "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
                "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
            )
            send_whatsapp_message(reservation['wa_id'], message)
        logging.info("All reminders sent successfully")
    except Exception as e:
        logging.error(f"Failed to send reminders: {e}")
        
if __name__ == "__main__":
    send_reminders()
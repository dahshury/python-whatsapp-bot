#!/usr/bin/env python3
from app.utils import send_whatsapp_message, get_tomorrow_reservations, append_message
import logging
import datetime
# from app.services.openai_service import safe_create_message
def send_reminders():
    try:
        reservations = get_tomorrow_reservations()
        for reservation in reservations:
            message = (
                f"نذكركم بأن لديكم حجز غدًا في {reservation['time_slot']}.\n"
                "نرجو التكرم بالحضور في موعد الحجز المحدد.\n"
                "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
                "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
            )
            send_whatsapp_message(reservation['wa_id'], message)
            datetime_obj = datetime.datetime.now()
            curr_date = datetime_obj.date().isoformat()
            curr_time = datetime_obj.strftime("%I:%M %p")
            # safe_create_message(reservation['wa_id'], 'assistant', message)
            append_message(reservation['wa_id'], "secretary", message, curr_date, curr_time)
        logging.info("All reminders sent successfully")
    except Exception as e:
        logging.error(f"Failed to send reminders: {e}")
        
if __name__ == "__main__":
    send_reminders()
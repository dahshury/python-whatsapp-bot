from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import datetime

from app.config import get
from app.utils.service_utils import get_tomorrow_reservations
from app.utils.whatsapp_utils import append_message, send_whatsapp_template


def send_reminders_job():
    logging.info("Starting scheduled reminders job")
    reservations = get_tomorrow_reservations()
    if not reservations:
        logging.info("No reservations found for tomorrow")
        return
    logging.info(f"Found {len(reservations)} reservations for tomorrow")
    for reservation in reservations:
        components = [
            {"type": "body", "parameters": [{"type": "text", "text": reservation["time_slot"]}]}]
        message = (
            f"نذكركم بأن لديكم حجز غدًا في عيادة الدكتورة أمل سعيد، الساعة {reservation['time_slot']}.\n"
            "نرجو التكرم بالحضور في موعد الحجز المحدد.\n"
            "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
            "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
        )
        send_whatsapp_template(
            reservation["wa_id"], "appointment_reminder", "ar", components
        )
        now = datetime.datetime.now()
        append_message(
            reservation["wa_id"], "secretary", message,
            now.date().isoformat(), now.strftime("%I:%M %p")
        )
        logging.info(f"Reminder sent to {reservation['wa_id']}")
    logging.info("Scheduled reminders job complete")


def init_scheduler(app):
    """Initialize and start the background scheduler with a daily job."""
    tz = get("TIMEZONE", "UTC")
    scheduler = BackgroundScheduler(timezone=tz)
    # Schedule job every day at 19:00
    trigger = CronTrigger(hour=19, minute=0)
    scheduler.add_job(
        send_reminders_job,
        trigger,
        id="send_reminders",
        replace_existing=True
    )
    scheduler.start()
    app.state.scheduler = scheduler
    logging.info("Scheduler started with TIMEZONE=%s", tz) 
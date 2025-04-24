import logging
import datetime
import os
import subprocess
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import config
from app.utils.service_utils import get_tomorrow_reservations, parse_time
from app.utils.whatsapp_utils import append_message, send_whatsapp_template
from app.metrics import monitor_system_metrics


def send_reminders_job():
    """
    Send appointment reminders to patients with reservations for tomorrow.
    
    Fetches all tomorrow's reservations and sends WhatsApp template messages
    to remind patients of their appointments.
    """
    logging.info("Starting scheduled reminders job")
    reservations = get_tomorrow_reservations()
    
    if not reservations:
        logging.info("No reservations found for tomorrow")
        return
    
    logging.info(f"Found {len(reservations)} reservations for tomorrow")
    
    for reservation in reservations:
        # Prepare template components
        components = [
            {"type": "body", "parameters": [{"type": "text", "text": reservation["time_slot"]}]}
        ]
        
        # Prepare reminder message
        formatted_time = parse_time(reservation['time_slot'], to_24h=False)
        message = (
            f"نذكركم بأن لديكم حجز غدًا في عيادة الدكتورة أمل سعيد، الساعة {formatted_time}.\n"
            "نرجو التكرم بالحضور في موعد الحجز المحدد.\n"
            "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
            "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
        )
        
        # Send WhatsApp template message
        send_whatsapp_template(
            reservation["wa_id"], 
            "appointment_reminder", 
            "ar", 
            components
        )
        
        # Log the message in the conversation history
        now = datetime.datetime.now()
        append_message(
            reservation["wa_id"], 
            "secretary", 
            message,
            now.date().isoformat(), 
            now.strftime("%H:%M:%S")
        )
        
        logging.info(f"Reminder sent to {reservation['wa_id']}")
    
    logging.info("Scheduled reminders job complete")


def run_database_backup():
    """
    Execute the SQLite database backup script.
    
    This job runs the sqlite_backup.sh script which handles:
    - Backing up the database file
    - Compressing and storing backups
    - Cleaning up old backups
    - Uploading to remote storage (if configured)
    """
    try:
        logging.info("Starting database backup job")
        
        # Path to backup script
        script_path = "/app/scripts/sqlite_backup.sh"
        
        # Check if script exists
        if not os.path.isfile(script_path):
            logging.error(f"Backup script not found at {script_path}")
            return
        
        # Ensure script is executable
        try:
            os.chmod(script_path, 0o755)
        except Exception as chmod_error:
            logging.warning(f"Could not set executable permission: {chmod_error}")
        
        # Execute the backup script
        process = subprocess.Popen(
            ["/bin/bash", script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Get output with timeout (to prevent hanging)
        try:
            stdout, stderr = process.communicate(timeout=300)  # 5-minute timeout
            
            if process.returncode == 0:
                logging.info("Database backup completed successfully")
                # Log stdout at debug level
                for line in stdout.splitlines():
                    logging.debug(f"Backup: {line}")
            else:
                logging.error(f"Database backup failed with code {process.returncode}")
                for line in stderr.splitlines():
                    logging.error(f"Backup error: {line}")
        except subprocess.TimeoutExpired:
            process.kill()
            logging.error("Database backup timed out after 5 minutes")
            
    except Exception as e:
        logging.error(f"Error during database backup: {e}")


def init_scheduler(app):
    """
    Initialize and start the background scheduler with a daily job.
    
    Args:
        app: The FastAPI application instance
    """
    tz = config.get("TIMEZONE", "UTC")
    scheduler = BackgroundScheduler(timezone=tz)
    
    # Schedule job every day at 19:00
    trigger = CronTrigger(hour=19, minute=0)
    scheduler.add_job(
        send_reminders_job,
        trigger,
        id="send_reminders",
        replace_existing=True
    )
    
    # Schedule system metrics polling every 30 seconds
    scheduler.add_job(
        monitor_system_metrics,
        'interval',
        seconds=60*3,
        id="system_metrics",
        replace_existing=True
    )
    
    # Schedule database backup job every day at 02:00
    backup_trigger = CronTrigger(hour=2, minute=0)
    scheduler.add_job(
        run_database_backup,
        backup_trigger,
        id="database_backup",
        replace_existing=True
    )
    
    scheduler.start()
    app.state.scheduler = scheduler
    logging.info("Scheduler started with TIMEZONE=%s", tz)
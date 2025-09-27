import logging
import datetime
import os
import subprocess
import traceback
import gc
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_MISSED, EVENT_JOB_ERROR

from app.config import config
from app.utils.service_utils import get_tomorrow_reservations, parse_time
from app.utils.whatsapp_utils import append_message, send_whatsapp_template
from app.metrics import (
    monitor_system_metrics,
    FUNCTION_ERRORS,
    SCHEDULER_JOB_MISSED,
    BACKUP_SCRIPT_FAILURES,
    BACKUP_SCRIPT_FAILURES_BY_REASON,
    SCHEDULER_JOB_MISSED_BY_REASON,
)

# Track if scheduler has been initialized in this process
_scheduler_initialized = False
tz = config.get("TIMEZONE", "Asia/Riyadh")

async def send_reminders_job():
    """
    Send appointment reminders to patients with reservations for tomorrow.
    
    Fetches all tomorrow's reservations and sends WhatsApp template messages
    to remind patients of their appointments.
    """
    pid = os.getpid()
    logging.info(f"send_reminders_job start in pid {pid}")
    logging.info("Starting scheduled reminders job")
    
    try:
        # Fetch tomorrow's reservations
        response = get_tomorrow_reservations()
        logging.info(f"get_tomorrow_reservations response: {response}")
        
        if not response.get("success", False):
            error_msg = response.get("message", "Unknown error")
            logging.error(f"Failed to get tomorrow's reservations: {error_msg}")
            FUNCTION_ERRORS.labels(function="send_reminders_job").inc()
            return
            
        reservations = response.get("data", [])
        if not reservations:
            logging.info("No reservations found for tomorrow")
            return
        
        logging.info(f"Found {len(reservations)} reservations for tomorrow")
        
        for reservation in reservations:
            try:
                # Defensive: skip non-active reservations if any slipped through
                if reservation.get("status") and reservation.get("status") != "active":
                    logging.info(f"Skipping non-active reservation for {reservation.get('wa_id')} status={reservation.get('status')}")
                    continue
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
                
                # Send WhatsApp template message using async helper
                logging.info(f"Sending template to {reservation['wa_id']}")
                template_response = await send_whatsapp_template(
                    reservation["wa_id"],
                    "appointment_reminder",
                    "ar",
                    components
                )
                logging.info(f"Template response: {template_response}")
                
                # Log the message in the conversation history
                now = datetime.datetime.now(tz=ZoneInfo(tz))
                append_message(
                    reservation["wa_id"], 
                    "secretary", 
                    message,
                    now.date().isoformat(),
                    now.strftime("%H:%M:%S")
                )
                
                logging.info(f"Reminder sent to {reservation['wa_id']}")
            except Exception as e:
                FUNCTION_ERRORS.labels(function="send_reminders_job").inc()
                logging.error(f"Error processing reservation {reservation.get('wa_id', 'unknown')}: {e}")
                logging.error(traceback.format_exc())
                continue
                
    except Exception as e:
        FUNCTION_ERRORS.labels(function="send_reminders_job").inc()
        logging.error(f"Fatal error in send_reminders_job: {e}")
        logging.error(traceback.format_exc())
    
    logging.info(f"Scheduled reminders job complete in pid {pid}")


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
        
        # Determine path to backup script (supports container and local development)
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        script_path = os.path.join(project_root, "scripts", "sqlite_backup.sh")
        
        # Check if script exists
        if not os.path.isfile(script_path):
            logging.error(f"Backup script not found at {script_path}")
            BACKUP_SCRIPT_FAILURES.inc()
            BACKUP_SCRIPT_FAILURES_BY_REASON.labels(
                reason="script_not_found", stage="preflight", exit_code="127"
            ).inc()
            FUNCTION_ERRORS.labels(function="run_database_backup").inc()
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
                for line in stdout.splitlines():
                    logging.debug(f"Backup: {line}")
            else:
                logging.error(
                    f"Database backup failed with code {process.returncode}"
                )
                # Classify failure reason and stage from structured output or heuristics
                reason, stage, exit_code = _classify_backup_failure(stdout, stderr, process.returncode)
                BACKUP_SCRIPT_FAILURES.inc()
                BACKUP_SCRIPT_FAILURES_BY_REASON.labels(
                    reason=reason, stage=stage, exit_code=str(exit_code)
                ).inc()
                FUNCTION_ERRORS.labels(function="run_database_backup").inc()
                logging.error(
                    f"Backup failure classified: reason={reason} stage={stage} exit_code={exit_code}"
                )
                for line in (stderr or "").splitlines():
                    logging.error(f"Backup error: {line}")
                for line in (stdout or "").splitlines():
                    if line.startswith("BACKUP_ERROR"):
                        logging.error(f"Backup error detail: {line}")
        except subprocess.TimeoutExpired:
            process.kill()
            logging.error("Database backup timed out after 5 minutes")
            BACKUP_SCRIPT_FAILURES.inc()
            BACKUP_SCRIPT_FAILURES_BY_REASON.labels(
                reason="timeout", stage="timeout", exit_code="timeout"
            ).inc()
            FUNCTION_ERRORS.labels(function="run_database_backup").inc()
            
    except Exception as e:
        logging.error(f"Error during database backup: {e}")
        BACKUP_SCRIPT_FAILURES.inc()
        BACKUP_SCRIPT_FAILURES_BY_REASON.labels(
            reason="unhandled_exception", stage="scheduler", exit_code="exception"
        ).inc()
        FUNCTION_ERRORS.labels(function="run_database_backup").inc()


def _classify_backup_failure(stdout: str, stderr: str, returncode: int):
    """
    Attempt to classify the backup failure reason and stage from the script output.

    Returns a tuple: (reason, stage, exit_code)
    """
    try:
        combined = []
        if stdout:
            combined.extend(stdout.splitlines())
        if stderr:
            combined.extend(stderr.splitlines())

        # Prefer structured error lines emitted by the script
        for line in combined:
            line_stripped = line.strip()
            if line_stripped.startswith("BACKUP_ERROR"):
                # Format: BACKUP_ERROR stage=... code=... reason=... ...
                reason = None
                stage = None
                code = None
                parts = line_stripped.split()
                for part in parts:
                    if part.startswith("reason="):
                        reason = part.split("=", 1)[1]
                    elif part.startswith("stage="):
                        stage = part.split("=", 1)[1]
                    elif part.startswith("code="):
                        code = part.split("=", 1)[1]
                return (
                    reason or "unknown_error",
                    stage or "unknown",
                    code or str(returncode),
                )

        # Heuristic classification
        text = "\n".join(combined)
        if "Database not found" in text:
            return "db_not_found", "preflight", str(returncode)
        if "Permission denied" in text:
            return "permission_denied", "preflight", str(returncode)
        if "locked" in text.lower() and "sqlite" in text.lower():
            return "sqlite_locked", "sqlite_backup", str(returncode)
        if "zip" in text.lower() and "error" in text.lower():
            return "zip_failed", "compress_zip", str(returncode)
        if "aws s3" in text.lower() or "An error occurred" in text:
            return "s3_upload_failed", "s3_upload", str(returncode)
        if "wal_checkpoint" in text.lower():
            return "wal_checkpoint_failed", "wal_checkpoint", str(returncode)
        return "unknown_error", "unknown", str(returncode)
    except Exception:
        return "unknown_error", "unknown", str(returncode)


# Define a job to manually trigger Python garbage collection
def collect_garbage_job():
    collected = gc.collect()
    logging.info(f"Garbage collection manually triggered: collected {collected} objects")


# Listener function for APScheduler missed job events
def scheduler_listener(event):
    if event.code == EVENT_JOB_MISSED:
        job_id = event.job_id
        logging.warning(f"Run time of job {job_id} was missed")
        SCHEDULER_JOB_MISSED.inc()
        try:
            SCHEDULER_JOB_MISSED_BY_REASON.labels(
                reason="missed_start_deadline", job_id=str(job_id)
            ).inc()
        except Exception:
            pass
    elif event.code == EVENT_JOB_ERROR:
        job_id = event.job_id
        exception = event.exception
        logging.error(f"Job {job_id} raised an exception: {exception}")
        FUNCTION_ERRORS.labels(function=f"scheduler_job_{job_id}").inc()


def init_scheduler(app):
    """
    Initialize and start the background scheduler with a daily job.
    
    Args:
        app: The FastAPI application instance
    """
    global _scheduler_initialized
    pid = os.getpid()
    # File lock to ensure only one scheduler instance across processes
    lock_file = '/tmp/scheduler.lock'
    
    # Check if lock file exists but points to a non-existent process
    try:
        if os.path.exists(lock_file):
            with open(lock_file, 'r') as f:
                old_pid = f.read().strip()
                logging.info(f"Found existing scheduler lock with PID {old_pid}")
                
                # Check if process exists
                try:
                    os.kill(int(old_pid), 0)  # Signal 0 doesn't kill the process, just checks if it exists
                except (OSError, ProcessLookupError, ValueError):
                    # Process doesn't exist, remove stale lock
                    logging.warning(f"Removing stale scheduler lock for non-existent PID {old_pid}")
                    os.remove(lock_file)
                except Exception as e:
                    logging.warning(f"Error checking PID {old_pid}: {e}")
    except Exception as e:
        logging.warning(f"Error handling lock file: {e}")
    
    # Try to create lock file
    try:
        fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(pid).encode())
        os.close(fd)
    except FileExistsError:
        logging.warning(f"Scheduler already running in another process, lock file exists: {lock_file}, skipping init in pid {pid}")
        return
    
    # Prevent multiple inits within the same process
    if _scheduler_initialized:
        logging.warning(f"init_scheduler already called in pid {pid}, skipping scheduler setup")
        return
    
    logging.info(f"init_scheduler start in pid {pid}")
    _scheduler_initialized = True
    scheduler = AsyncIOScheduler(timezone=tz)
    
    # Add the job missed listener
    scheduler.add_listener(scheduler_listener, EVENT_JOB_MISSED | EVENT_JOB_ERROR)
    
    # Schedule job every day at 19:00
    trigger = CronTrigger(hour=19, minute=0, timezone=tz)
    logging.info(f"Adding job 'send_reminders' with trigger {trigger} in pid {pid}")
    scheduler.add_job(
        send_reminders_job,
        trigger,
        id="send_reminders",
        replace_existing=True,
        misfire_grace_time=300
    )
    
    # Schedule system metrics polling every 30 seconds
    logging.info(f"Adding job 'system_metrics' interval 180s in pid {pid}")
    scheduler.add_job(
        monitor_system_metrics,
        'interval',
        seconds=60*3,
        id="system_metrics",
        replace_existing=True,
        misfire_grace_time=300
    )
    
    # Schedule database backup job every day at 00:00
    backup_trigger = CronTrigger(hour=0, minute=0, timezone=tz)
    logging.info(f"Adding job 'database_backup' with trigger {backup_trigger} in pid {pid}")
    scheduler.add_job(
        run_database_backup,
        backup_trigger,
        id="database_backup",
        replace_existing=True,
        misfire_grace_time=300
    )
    
    # Schedule manual garbage collection every hour
    scheduler.add_job(
        collect_garbage_job,
        'interval',
        hours=1,
        id="gc_collect",
        replace_existing=True,
        misfire_grace_time=300
    )
    
    scheduler.start()
    app.state.scheduler = scheduler
    logging.info(f"Scheduler started with TIMEZONE={tz}, job count={len(scheduler.get_jobs())} in pid {pid}")
    # Ensure lock file is removed when scheduler shuts down
    def _cleanup_lock():
        try:
            os.remove(lock_file)
            logging.info(f"Removed scheduler lock file {lock_file} on shutdown in pid {pid}")
        except Exception as e:
            logging.warning(f"Failed to remove scheduler lock file {lock_file}: {e}")
    import atexit
    atexit.register(_cleanup_lock)
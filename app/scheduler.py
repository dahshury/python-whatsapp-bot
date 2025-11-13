import contextlib
import datetime
import gc
import logging
import os
import traceback
from zoneinfo import ZoneInfo

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import config
from app.db import DATABASE_URL, engine
from app.metrics import (
    BACKUP_SCRIPT_FAILURES,
    BACKUP_SCRIPT_FAILURES_BY_REASON,
    FUNCTION_ERRORS,
    SCHEDULER_JOB_MISSED,
    SCHEDULER_JOB_MISSED_BY_REASON,
    monitor_system_metrics,
)
from app.services.backup import S3DatabaseBackupService, build_config_from_environment
from app.utils.service_utils import get_tomorrow_reservations, parse_time
from app.utils.whatsapp_utils import append_message, send_whatsapp_template

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
                    logging.info(
                        f"Skipping non-active reservation for {reservation.get('wa_id')} status={reservation.get('status')}"
                    )
                    continue
                # Prepare template components
                components = [{"type": "body", "parameters": [{"type": "text", "text": reservation["time_slot"]}]}]

                # Prepare reminder message
                formatted_time = parse_time(reservation["time_slot"], to_24h=False)
                message = (
                    f"نذكركم بأن لديكم حجز غدًا في عيادة الدكتورة أمل سعيد، الساعة {formatted_time}.\n"
                    "نرجو التكرم بالحضور في موعد الحجز المحدد.\n"
                    "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
                    "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
                )

                # Send WhatsApp template message using async helper
                logging.info(f"Sending template to {reservation['wa_id']}")
                template_response = await send_whatsapp_template(
                    reservation["wa_id"], "appointment_reminder", "ar", components
                )
                logging.info(f"Template response: {template_response}")

                # Log the message in the conversation history
                now = datetime.datetime.now(tz=ZoneInfo(tz))
                append_message(
                    reservation["wa_id"], "secretary", message, now.date().isoformat(), now.strftime("%H:%M:%S")
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
    """Execute the PostgreSQL database backup via the aws_s3 extension."""
    logger = logging.getLogger("app.scheduler.backup")
    env = dict(os.environ)
    env.setdefault("DATABASE_URL", DATABASE_URL)

    try:
        config = build_config_from_environment(env)
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to build backup configuration: %s", exc)
        BACKUP_SCRIPT_FAILURES.inc()
        BACKUP_SCRIPT_FAILURES_BY_REASON.labels(reason="config_error", stage="configuration", exit_code="config").inc()
        FUNCTION_ERRORS.labels(function="run_database_backup").inc()
        return

    if config is None:
        logger.info("Skipping database backup: S3_BUCKET is not configured")
        return

    service = S3DatabaseBackupService(engine, logger=logger)

    try:
        result = service.perform_backup(config)
        duration = (result.completed_at - result.started_at).total_seconds()
        logger.info(
            "Database backup completed",
            extra={
                "object_key": result.object_key,
                "bytes_uploaded": result.bytes_uploaded,
                "compression": result.compression,
                "duration_seconds": duration,
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Database backup failed: %s", exc)
        logger.error(traceback.format_exc())
        BACKUP_SCRIPT_FAILURES.inc()
        BACKUP_SCRIPT_FAILURES_BY_REASON.labels(
            reason="execution_failure", stage="pg_dump_to_s3", exit_code="exception"
        ).inc()
        FUNCTION_ERRORS.labels(function="run_database_backup").inc()


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
        with contextlib.suppress(Exception):
            SCHEDULER_JOB_MISSED_BY_REASON.labels(reason="missed_start_deadline", job_id=str(job_id)).inc()
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
    lock_file = "/tmp/scheduler.lock"

    # Check if lock file exists but points to a non-existent process
    try:
        if os.path.exists(lock_file):
            with open(lock_file) as f:
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
        logging.warning(
            f"Scheduler already running in another process, lock file exists: {lock_file}, skipping init in pid {pid}"
        )
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
    scheduler.add_job(send_reminders_job, trigger, id="send_reminders", replace_existing=True, misfire_grace_time=300)

    # Schedule system metrics polling every 30 seconds
    logging.info(f"Adding job 'system_metrics' interval 180s in pid {pid}")
    scheduler.add_job(
        monitor_system_metrics,
        "interval",
        seconds=60 * 3,
        id="system_metrics",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Schedule database backup job every day at 00:00
    backup_trigger = CronTrigger(hour=0, minute=0, timezone=tz)
    logging.info(f"Adding job 'database_backup' with trigger {backup_trigger} in pid {pid}")
    scheduler.add_job(
        run_database_backup, backup_trigger, id="database_backup", replace_existing=True, misfire_grace_time=300
    )

    # Schedule manual garbage collection every hour
    scheduler.add_job(
        collect_garbage_job, "interval", hours=1, id="gc_collect", replace_existing=True, misfire_grace_time=300
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

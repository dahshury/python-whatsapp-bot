import atexit
import datetime
import gc
import os
import subprocess
from pathlib import Path

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from zoneinfo import ZoneInfo

from app.config import config
from app.infrastructure.logging import get_service_logger
from app.metrics import (
    BACKUP_SCRIPT_FAILURES,
    FUNCTION_ERRORS,
    SCHEDULER_JOB_MISSED,
    monitor_system_metrics,
)
from app.utils.service_utils import get_all_reservations, parse_time
from app.utils.whatsapp_utils import append_message, send_whatsapp_template


# Set up domain-specific logger
logger = get_service_logger()


# Track if scheduler has been initialized in this process
class SchedulerState:
    """Singleton class to track scheduler initialization state"""
    _initialized = False

    @classmethod
    def is_initialized(cls) -> bool:
        return cls._initialized

    @classmethod
    def set_initialized(cls) -> None:
        cls._initialized = True

tz = config.get("TIMEZONE", "Asia/Riyadh")


async def send_reminders_job():
    """
    Send appointment reminders to patients with reservations for tomorrow.

    Fetches all tomorrow's reservations and sends WhatsApp template messages
    to remind patients of their appointments.
    """
    pid = os.getpid()
    logger.info("send_reminders_job start in pid %s", pid)
    logger.info("Starting scheduled reminders job")

    try:
        # Calculate tomorrow's date
        today = datetime.datetime.now(tz=ZoneInfo(tz))
        tomorrow = today + datetime.timedelta(days=1)
        tomorrow_date_str = tomorrow.strftime("%Y-%m-%d")

        # Fetch all future reservations
        response = await get_all_reservations(future=True, include_cancelled=False)
        logger.info("get_all_reservations response: %s", response)

        if not response.get("success", False):
            error_msg = response.get("message", "Unknown error")
            logger.error("Failed to get reservations: %s", error_msg)
            FUNCTION_ERRORS.labels(function="send_reminders_job").inc()
            return

        # Filter for tomorrow's reservations only
        tomorrow_reservations = []
        all_reservations = response.get("data", {})
        for wa_id, user_reservations in all_reservations.items():
            for reservation in user_reservations:
                if reservation.get("date") == tomorrow_date_str:
                    # Add wa_id to reservation for template sending
                    reservation["wa_id"] = wa_id
                    tomorrow_reservations.append(reservation)

        if not tomorrow_reservations:
            logger.info("No reservations found for tomorrow")
            return

        logger.info("Found %s reservations for tomorrow", len(tomorrow_reservations))

        # Process reservations with error-safe batch approach for better performance
        async def process_single_reservation(reservation):
            """Process a single reservation with error handling"""
            # Prepare template components
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": reservation["time_slot"]}
                    ],
                }
            ]

            # Prepare reminder message
            formatted_time = parse_time(reservation["time_slot"], to_24h=False)
            message = (
                f"نذكركم بأن لديكم حجز غدًا في عيادة الدكتورة أمل سعيد، الساعة {formatted_time}.\n"
                "نرجو التكرم بالحضور في موعد الحجز المحدد.\n"
                "يفضل الحضور قبل موعد الحجز ب 10 دقائق.\n"
                "الدخول في الفترة الزمنية المحددة بالأعلى يكون بأسبقية الحضور."
            )

            # Send WhatsApp template message using async helper
            logger.info("Sending template to %s", reservation['wa_id'])
            template_response = await send_whatsapp_template(
                reservation["wa_id"], "appointment_reminder", "ar", components
            )
            logger.info("Template response: %s", template_response)

            # Log the message in the conversation history
            now = datetime.datetime.now(tz=ZoneInfo(tz))
            await append_message(
                reservation["wa_id"],
                "secretary",
                message,
                now.date().isoformat(),
                now.strftime("%H:%M:%S"),
            )

            logger.info("Reminder sent to %s", reservation['wa_id'])

        # Process all reservations with individual error handling
        async def _safe_process_single(res):
            """Wrapper to process a reservation and capture exceptions once."""
            try:
                await process_single_reservation(res)
            except (ValueError, KeyError, TypeError, OSError):
                FUNCTION_ERRORS.labels(function="send_reminders_job").inc()
                logger.exception("Error processing reservation %s", res.get("wa_id", "unknown"))
                return res.get("wa_id", "unknown")
            else:
                return None  # success indicator

        # Run sequentially - could be gathered concurrently later
        failed_reservations = [wa_id for wa_id in [await _safe_process_single(r) for r in tomorrow_reservations] if wa_id]

        if failed_reservations:
            logger.error("Failed to process reservations for wa_ids=%s", failed_reservations)

    except (ValueError, KeyError, TypeError, OSError):
        FUNCTION_ERRORS.labels(function="send_reminders_job").inc()
        logger.exception("Fatal error in send_reminders_job")

    logger.info("Scheduled reminders job complete in pid %s", pid)


def run_database_backup() -> None:
    """
    Execute the SQLite database backup script.

    This job runs the sqlite_backup.sh script which handles:
    - Backing up the database file
    - Compressing and storing backups
    - Cleaning up old backups
    - Uploading to remote storage (if configured)
    """
    try:
        logger.info("Starting database backup job")

        # Determine path to backup script (supports container and local development)
        project_root = Path(__file__).parent.parent
        script_path = project_root / "scripts" / "sqlite_backup.sh"

        # Check if script exists
        if not script_path.is_file():
            logger.error("Backup script not found at %s", script_path)
            BACKUP_SCRIPT_FAILURES.inc()  # Increment the metric
            FUNCTION_ERRORS.labels(function="run_database_backup").inc()
            return

        # Ensure script is executable
        try:
            script_path.chmod(0o755)
        except (OSError, PermissionError):
            logger.warning("Could not set executable permission")

        # Execute the backup script
        process = subprocess.Popen(
            ["/bin/bash", script_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
        )

        # Get output with timeout (to prevent hanging)
        try:
            stdout, stderr = process.communicate(timeout=300)  # 5-minute timeout
        except subprocess.TimeoutExpired:
            process.kill()
            logger.exception("Database backup timed out after 5 minutes")
            BACKUP_SCRIPT_FAILURES.inc()  # Increment the metric
            FUNCTION_ERRORS.labels(function="run_database_backup").inc()
        else:
            if process.returncode == 0:
                logger.info("Database backup completed successfully")
                # Log stdout at debug level
                for line in stdout.splitlines():
                    logger.debug("Backup: %s", line)
            else:
                logger.error("Database backup failed with code %s", process.returncode)
                BACKUP_SCRIPT_FAILURES.inc()  # Increment the metric
                FUNCTION_ERRORS.labels(function="run_database_backup").inc()
                for line in stderr.splitlines():
                    FUNCTION_ERRORS.labels(function="run_database_backup").inc()
                    logger.error("Backup error: %s", line)

    except (OSError, subprocess.SubprocessError, FileNotFoundError):
        logger.exception("Error during database backup")
        BACKUP_SCRIPT_FAILURES.inc()  # Increment the metric
        FUNCTION_ERRORS.labels(function="run_database_backup").inc()


# Define a job to manually trigger Python garbage collection
def collect_garbage_job() -> None:
    collected = gc.collect()
    logger.info(
        "Garbage collection manually triggered: collected %s objects", collected
    )


# Listener function for APScheduler missed job events
def scheduler_listener(event) -> None:
    if event.code == EVENT_JOB_MISSED:
        job_id = event.job_id
        logger.warning("Run time of job %s was missed", job_id)
        SCHEDULER_JOB_MISSED.inc()  # Increment the missed job counter
    elif event.code == EVENT_JOB_ERROR:
        job_id = event.job_id
        exception = event.exception
        logger.error("Job %s raised an exception: %s", job_id, exception)
        FUNCTION_ERRORS.labels(function=f"scheduler_job_{job_id}").inc()


def init_scheduler(app) -> None:
    """
    Initialize and start the background scheduler with a daily job.

    Args:
        app: The FastAPI application instance
    """
    pid = os.getpid()
    # File lock to ensure only one scheduler instance across processes
    lock_file = "/tmp/scheduler.lock"

    # Check if lock file exists but points to a non-existent process
    try:
        if Path(lock_file).exists():
            with Path(lock_file).open() as f:
                old_pid = f.read().strip()
                logger.info("Found existing scheduler lock with PID %s", old_pid)

                # Check if process exists
                try:
                    os.kill(
                        int(old_pid), 0
                    )  # Signal 0 doesn't kill the process, just checks if it exists
                except (OSError, ProcessLookupError, ValueError):
                    # Process doesn't exist, remove stale lock
                    logger.warning(
                        "Removing stale scheduler lock for non-existent PID %s", old_pid
                    )
                    Path(lock_file).unlink()
    except (OSError, ValueError):
        logger.warning("Error checking existing lock file")

    # Try to create lock file
    try:
        fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(pid).encode())
        os.close(fd)
    except (OSError, ValueError, FileExistsError):
        logger.warning(
            "Scheduler already running in another process, lock file exists: %s, skipping init in pid %s", lock_file, pid
        )
        return

    # Prevent multiple inits within the same process
    if SchedulerState.is_initialized():
        logger.warning(
            "init_scheduler already called in pid %s, skipping scheduler setup", pid
        )
        return

    logger.info("init_scheduler start in pid %s", pid)
    SchedulerState.set_initialized()
    scheduler = AsyncIOScheduler(timezone=tz)

    # Add the job missed listener
    scheduler.add_listener(scheduler_listener, EVENT_JOB_MISSED | EVENT_JOB_ERROR)

    # Schedule job every day at 19:00
    trigger = CronTrigger(hour=19, minute=0, timezone=tz)
    logger.info("Adding job 'send_reminders' with trigger %s in pid %s", trigger, pid)
    scheduler.add_job(
        send_reminders_job,
        trigger,
        id="send_reminders",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Schedule system metrics polling every 30 seconds
    logger.info("Adding job 'system_metrics' interval 180s in pid %s", pid)
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
    logger.info(
        "Adding job 'database_backup' with trigger %s in pid %s", backup_trigger, pid
    )
    scheduler.add_job(
        run_database_backup,
        backup_trigger,
        id="database_backup",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Schedule manual garbage collection every hour
    scheduler.add_job(
        collect_garbage_job,
        "interval",
        hours=1,
        id="gc_collect",
        replace_existing=True,
        misfire_grace_time=300,
    )

    scheduler.start()
    app.state.scheduler = scheduler
    logger.info(
        "Scheduler started with TIMEZONE=%s, job count=%s in pid %s", tz, len(scheduler.get_jobs()), pid
    )

    # Ensure lock file is removed when scheduler shuts down
    def _cleanup_lock():
        try:
            Path(lock_file).unlink()
            logger.info(
                "Removed scheduler lock file %s on shutdown in pid %s", lock_file, pid
            )
        except Exception:
            logger.warning("Failed to remove scheduler lock file %s", lock_file)

    atexit.register(_cleanup_lock)

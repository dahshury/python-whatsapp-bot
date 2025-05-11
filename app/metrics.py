from prometheus_client import Counter, Gauge
import psutil

def monitor_system_metrics():
    """
    Poll system CPU and memory usage and update Prometheus gauges.
    """
    # CPU usage as a percentage of a single core
    cpu_percent = psutil.cpu_percent(interval=None)
    CPU_USAGE_PERCENT.set(cpu_percent)

    # Memory usage in bytes
    mem = psutil.Process().memory_info().rss
    MEMORY_USAGE_BYTES.set(mem)

# Domain-specific counters
RESERVATION_REQUESTS = Counter(
    'reservations_requested_total', 'Total reservation attempts'
)
RESERVATION_SUCCESSES = Counter(
    'reservations_successful_total', 'Total successful reservations'
)
RESERVATION_FAILURES = Counter(
    'reservations_failed_total', 'Total failed reservations'
)

CANCELLATION_REQUESTS = Counter(
    'reservations_cancellation_requested_total', 'Total cancellation attempts'
)
CANCELLATION_SUCCESSES = Counter(
    'reservations_cancellation_successful_total', 'Total successful cancellations'
)
CANCELLATION_FAILURES = Counter(
    'reservations_cancellation_failed_total', 'Total failed cancellations'
)

MODIFY_REQUESTS = Counter(
    'reservations_modification_requested_total', 'Total reservation modification attempts'
)
MODIFY_SUCCESSES = Counter(
    'reservations_modification_successful_total', 'Total successful modifications'
)
MODIFY_FAILURES = Counter(
    'reservations_modification_failed_total', 'Total failed modifications'
)

# Retry metrics: include exception type
RETRY_ATTEMPTS = Counter(
    'api_retry_attempts_total', 'Number of retry attempts', ['exception_type']
)

# Gauge to record the timestamp (seconds since epoch) of the most recent retry per exception type
RETRY_LAST_TIMESTAMP = Gauge(
    'api_retry_last_timestamp_seconds', 'Unix timestamp of last retry attempt', ['exception_type']
)

# System metrics
CPU_USAGE_PERCENT = Gauge(
    'process_cpu_percent', 'Current process CPU usage percent'
)
MEMORY_USAGE_BYTES = Gauge(
    'process_memory_bytes', 'Current process memory usage in bytes'
)

# LLM and backend function execution errors: include function name
FUNCTION_ERRORS = Counter(
    'assistant_function_errors_total',
    'Total errors in assistant function execution',
    ['function']
)

# Additional metrics for the specific errors reported
CLAUDE_API_ERRORS = Counter(
    'claude_api_errors_total',
    'Total errors from the Claude API'
)

ANTHROPIC_RETRY_ATTEMPTS = Counter(
    'anthropic_retry_attempts_total',
    'Number of retry attempts for Anthropic API requests'
)

WHATSAPP_MESSAGE_FAILURES = Counter(
    'whatsapp_message_failures_total',
    'Total number of WhatsApp message delivery failures'
)

SCHEDULER_JOB_MISSED = Counter(
    'scheduler_job_missed_total',
    'Total number of scheduler jobs that missed their execution time'
)

BACKUP_SCRIPT_FAILURES = Counter(
    'backup_script_failures_total',
    'Total number of backup script failures'
)

INVALID_HTTP_REQUESTS = Counter(
    'invalid_http_requests_total',
    'Total number of invalid HTTP requests received'
)

CONCURRENT_TASK_LIMIT_REACHED = Counter(
    'concurrent_task_limit_reached_total',
    'Number of times the concurrent task limit was reached'
) 
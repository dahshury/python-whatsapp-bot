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
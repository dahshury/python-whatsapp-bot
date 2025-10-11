import psutil
from prometheus_client import Counter, Gauge


def monitor_system_metrics() -> None:
    """
    Poll system CPU and memory usage and update Prometheus gauges.
    """
    # CPU usage as a percentage of a single core
    cpu_percent = psutil.cpu_percent(interval=None)
    CPU_USAGE_PERCENT.set(cpu_percent)

    # Memory usage in bytes
    process = psutil.Process()
    mem_info = process.memory_info()
    MEMORY_USAGE_BYTES.set(int(mem_info.rss))


# Domain-specific counters
RESERVATION_REQUESTS = Counter("reservations_requested_total", "Total reservation attempts")
RESERVATION_SUCCESSES = Counter("reservations_successful_total", "Total successful reservations")
RESERVATION_FAILURES = Counter("reservations_failed_total", "Total failed reservations")
RESERVATION_FAILURES_BY_REASON = Counter(
    "reservations_failed_by_reason_total",
    "Failed reservations categorized by reason and context",
    ["reason", "endpoint", "method"],
)

CANCELLATION_REQUESTS = Counter("reservations_cancellation_requested_total", "Total cancellation attempts")
CANCELLATION_SUCCESSES = Counter("reservations_cancellation_successful_total", "Total successful cancellations")
CANCELLATION_FAILURES = Counter("reservations_cancellation_failed_total", "Total failed cancellations")
CANCELLATION_FAILURES_BY_REASON = Counter(
    "reservations_cancellation_failed_by_reason_total",
    "Failed cancellations categorized by reason and context",
    ["reason", "endpoint", "method"],
)

MODIFY_REQUESTS = Counter("reservations_modification_requested_total", "Total reservation modification attempts")
MODIFY_SUCCESSES = Counter("reservations_modification_successful_total", "Total successful modifications")
MODIFY_FAILURES = Counter("reservations_modification_failed_total", "Total failed modifications")
MODIFY_FAILURES_BY_REASON = Counter(
    "reservations_modification_failed_by_reason_total",
    "Failed modifications categorized by reason and context",
    ["reason", "endpoint", "method"],
)

# Retry metrics: include exception type
RETRY_ATTEMPTS = Counter("api_retry_attempts_total", "Number of retry attempts", ["exception_type"])

# Retries exhausted after all attempts
RETRY_EXHAUSTED = Counter(
    "api_retry_exhausted_total", "Number of times retries were exhausted", ["function", "exception_type"]
)

# Gauge to record the timestamp (seconds since epoch) of the most recent retry per exception type
RETRY_LAST_TIMESTAMP = Gauge(
    "api_retry_last_timestamp_seconds", "Unix timestamp of last retry attempt", ["exception_type"]
)

# System metrics
CPU_USAGE_PERCENT = Gauge("process_cpu_percent", "Current process CPU usage percent")
MEMORY_USAGE_BYTES = Gauge("process_memory_bytes", "Current process memory usage in bytes")

# LLM and backend function execution errors: include function name
FUNCTION_ERRORS = Counter(
    "assistant_function_errors_total", "Total errors in assistant function execution", ["function"]
)

# Enhanced LLM metrics with detailed error types
LLM_API_ERRORS = Counter("llm_api_errors_total", "Total errors from LLM API calls", ["provider", "error_type"])

# Detailed LLM API errors with extra context for alert annotations
LLM_API_ERRORS_DETAILED = Counter(
    "llm_api_errors_detailed_total",
    "Detailed errors from LLM API calls with context",
    ["provider", "error_type", "exception_type", "http_status", "function"],
)

LLM_TOOL_EXECUTION_ERRORS = Counter(
    "llm_tool_execution_errors_total", "Total errors from executing tools called by LLMs", ["tool_name", "provider"]
)

LLM_RETRY_ATTEMPTS = Counter(
    "llm_retry_attempts_total", "Number of retry attempts for LLM API requests", ["provider", "error_type"]
)

LLM_EMPTY_RESPONSES = Counter(
    "llm_empty_responses_total", "Number of empty or invalid responses from LLMs", ["provider", "response_type"]
)

# Common error types for LLMs
# Provider-specific enum types should be handled with error_type="provider_specific" and detailed logs
LLM_ERROR_TYPES = {
    "authentication": "Authentication error (API key issues)",
    "rate_limit": "Rate limit exceeded",
    "context_length": "Context length exceeded",
    "timeout": "Request timeout",
    "server": "Server error (5xx)",
    "network": "Network connectivity issue",
    "provider_specific": "Provider-specific error",
    "bad_request": "Bad request (4xx)",
    "empty_response": "Empty response received",
    "invalid_response": "Invalid response format",
    "unknown": "Unknown error",
}

# Legacy metrics for backward compatibility
CLAUDE_API_ERRORS = LLM_API_ERRORS.labels(provider="anthropic", error_type="unknown")
CLAUDE_TOOL_EXECUTION_ERRORS = LLM_TOOL_EXECUTION_ERRORS
ANTHROPIC_RETRY_ATTEMPTS = LLM_RETRY_ATTEMPTS.labels(provider="anthropic", error_type="unknown")

WHATSAPP_MESSAGE_FAILURES = Counter(
    "whatsapp_message_failures_total", "Total number of WhatsApp message delivery failures"
)
WHATSAPP_MESSAGE_FAILURES_BY_REASON = Counter(
    "whatsapp_message_failures_by_reason_total",
    "WhatsApp failures by reason and message type",
    ["reason", "message_type"],
)

SCHEDULER_JOB_MISSED = Counter(
    "scheduler_job_missed_total", "Total number of scheduler jobs that missed their execution time"
)
SCHEDULER_JOB_MISSED_BY_REASON = Counter(
    "scheduler_job_missed_by_reason_total", "Missed scheduler jobs categorized by reason", ["reason", "job_id"]
)

BACKUP_SCRIPT_FAILURES = Counter("backup_script_failures_total", "Total number of backup script failures")

# Labeled version to capture clear reasons and stages for backup failures
BACKUP_SCRIPT_FAILURES_BY_REASON = Counter(
    "backup_script_failures_by_reason_total",
    "Total number of backup script failures categorized by reason and stage",
    ["reason", "stage", "exit_code"],
)

INVALID_HTTP_REQUESTS = Counter("invalid_http_requests_total", "Total number of invalid HTTP requests received")
INVALID_HTTP_REQUESTS_BY_REASON = Counter(
    "invalid_http_requests_by_reason_total",
    "Invalid HTTP requests categorized by reason and route",
    ["reason", "endpoint", "method"],
)

CONCURRENT_TASK_LIMIT_REACHED = Counter(
    "concurrent_task_limit_reached_total", "Number of times the concurrent task limit was reached"
)

CONCURRENT_TASK_LIMIT_REACHED_BY_REASON = Counter(
    "concurrent_task_limit_reached_by_reason_total",
    "Concurrent task limit events categorized by reason and route",
    ["reason", "endpoint", "method"],
)

# Inbound durable queue metrics
INBOUND_QUEUE_ENQUEUED = Counter(
    "inbound_queue_enqueued_total",
    "Total inbound webhook messages enqueued into DB-backed queue",
    ["source"],  # e.g., source="webhook"
)

INBOUND_QUEUE_ENQUEUE_DUPLICATE = Counter(
    "inbound_queue_enqueue_duplicate_total", "Total inbound messages skipped due to duplicate message_id", ["source"]
)

INBOUND_QUEUE_CLAIMED = Counter("inbound_queue_claimed_total", "Total queue items successfully claimed by workers")

INBOUND_QUEUE_PROCESSED = Counter("inbound_queue_processed_total", "Total inbound queue items processed successfully")

INBOUND_QUEUE_PROCESSING_ERRORS = Counter(
    "inbound_queue_processing_errors_total", "Total inbound queue items that failed during processing"
)

INBOUND_QUEUE_CLAIM_FAILURES = Counter(
    "inbound_queue_claim_failures_total", "Total failures when attempting to claim a queue item"
)

INBOUND_QUEUE_LENGTH = Gauge("inbound_queue_length", "Current number of pending inbound queue items")

INBOUND_QUEUE_OLDEST_AGE_SECONDS = Gauge(
    "inbound_queue_oldest_age_seconds", "Age in seconds of the oldest pending inbound queue item"
)

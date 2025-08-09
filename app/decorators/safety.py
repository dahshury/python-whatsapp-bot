import functools
import time
import traceback

import httpx
import openai
from anthropic import (
    AnthropicError,
    APIConnectionError,
    APIError,
    APIStatusError,
    RateLimitError,
)
from tenacity import retry, retry_if_exception_type, stop_after_delay, wait_exponential

from app.infrastructure.logging import get_service_logger
from app.metrics import RETRY_ATTEMPTS, RETRY_LAST_TIMESTAMP


# Set up domain-specific logger
logger = get_service_logger()


def retry_decorator(func):
    """
    A modular retry decorator to handle retries for API calls.
    """

    def _record_retry(retry_state):
        exc = retry_state.outcome.exception()
        exc_name = type(exc).__name__ if exc else "Unknown"
        RETRY_ATTEMPTS.labels(exception_type=exc_name).inc()
        # Record the Unix timestamp of this retry
        RETRY_LAST_TIMESTAMP.labels(exception_type=exc_name).set(time.time())

    # The retry function from tenacity
    retry_func = retry(
        wait=wait_exponential(multiplier=3, min=10, max=3600),
        stop=stop_after_delay(10800),  # Stop retrying after ~3 hours total delay
        retry=retry_if_exception_type(
            (
                httpx.ConnectError,
                httpx.ReadTimeout,
                httpx.HTTPError,
                AnthropicError,
                RateLimitError,
                APIStatusError,
                APIError,
                APIConnectionError,
                openai.APIConnectionError,
                Exception,
            )
        ),
        after=_record_retry,
    )(func)

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return retry_func(*args, **kwargs)
        except Exception:
            # Log detailed error after all retries are exhausted
            logger.exception("ALL RETRIES EXHAUSTED for %s", func.__name__)
            logger.exception("=============== RETRY FAILURE DETAILS ===============")
            logger.exception(traceback.format_exc())
            logger.exception("====================================================")
            # Re-raise the exception so it can be handled by the caller
            raise

    return wrapper

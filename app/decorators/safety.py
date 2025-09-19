from tenacity import retry, wait_exponential, stop_after_delay, retry_if_exception_type
import httpx
import openai
import logging
from anthropic import AnthropicError, RateLimitError, APIStatusError, APIError, APIConnectionError
from openai import APITimeoutError
from app.metrics import RETRY_ATTEMPTS, RETRY_LAST_TIMESTAMP, RETRY_EXHAUSTED
import time
import functools
import traceback

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
        retry=retry_if_exception_type((
            httpx.ConnectError,
            httpx.ReadTimeout,
            httpx.HTTPError,
            AnthropicError,
            RateLimitError,
            APIStatusError,
            APIError,
            APIConnectionError,
            openai.APIConnectionError,
            openai.APIError,
            openai.RateLimitError,
            APITimeoutError,
            # Removed generic Exception to prevent retrying business logic errors
        )),
        after=_record_retry
    )(func)
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return retry_func(*args, **kwargs)
        except Exception as e:
            # Log detailed error after all retries are exhausted
            logging.error(f"ALL RETRIES EXHAUSTED for {func.__name__}: {e}")
            logging.error("=============== RETRY FAILURE DETAILS ===============")
            logging.error(traceback.format_exc())
            logging.error("====================================================")
            # Increment metric for exhausted retries with function and exception type labels
            try:
                exception_name = type(e).__name__
            except Exception:
                exception_name = "Unknown"
            try:
                RETRY_EXHAUSTED.labels(function=func.__name__, exception_type=exception_name).inc()
            except Exception:
                pass
            # Re-raise the exception so it can be handled by the caller
            raise
            
    return wrapper
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type, RetryError
import httpx
import openai
import logging
from anthropic import AnthropicError, RateLimitError, APIStatusError, APIError, APIConnectionError
from app.metrics import RETRY_ATTEMPTS, RETRY_LAST_TIMESTAMP
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
        wait=wait_exponential(multiplier=3, min=10, max=3600),  # Longer max wait for overloaded servers
        stop=stop_after_attempt(100),
        retry=retry_if_exception_type((
            httpx.ConnectError,
            httpx.ReadTimeout,
            httpx.HTTPError,
            AnthropicError,  # Base class for all Anthropic errors
            RateLimitError,
            APIStatusError,
            APIError,
            APIConnectionError,
            openai.APIConnectionError,
            Exception  # Catch all other exceptions as a fallback
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
            # Re-raise the exception so it can be handled by the caller
            raise
            
    return wrapper
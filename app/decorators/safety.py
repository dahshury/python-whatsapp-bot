from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import httpx
from anthropic import AnthropicError, RateLimitError

def retry_decorator(func):
    """
    A modular retry decorator to handle retries for Claude API calls.
    """
    return retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),  # Longer max wait for overloaded servers
        stop=stop_after_attempt(10),
        retry=retry_if_exception_type((
            httpx.ConnectError,
            AnthropicError,
            RateLimitError,
        ))
    )(func)
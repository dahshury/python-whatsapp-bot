from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import httpx
import openai
from anthropic import AnthropicError, RateLimitError, APIStatusError, APIError, APIConnectionError

def retry_decorator(func):
    """
    A modular retry decorator to handle retries for API calls.
    """
    return retry(
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
        ))
    )(func)
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import httpx
import openai
from anthropic import AnthropicError, RateLimitError, APIStatusError

def retry_decorator(func):
    """
    A modular retry decorator to handle retries for Claude API calls.
    """
    return retry(
        wait=wait_exponential(multiplier=2, min=10, max=3600),  # Longer max wait for overloaded servers
        stop=stop_after_attempt(100),
        retry=retry_if_exception_type((
            httpx.ConnectError,
            AnthropicError,
            RateLimitError,
            APIStatusError,
            openai.APIConnectionError
        ))
    )(func)
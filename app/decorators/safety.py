from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import httpx
import openai

def retry_decorator(func):
    """
    A modular retry decorator to handle retries for functions.
    """
    return retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(5),
        retry=retry_if_exception_type((httpx.ConnectError, openai.APIConnectionError))
    )(func)
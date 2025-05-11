import ssl
import certifi
import httpx
import logging
import asyncio

# Build a standard SSL context using the certifi CA bundle
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

# Synchronous client for blocking calls (e.g., OpenAI)
sync_client = httpx.Client(verify=ssl_context)

# Asynchronous client for async calls (e.g., WhatsApp API)
async_client = httpx.AsyncClient(
    timeout=30.0,  # Increased from 10.0 to 30.0 seconds
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
    retry=httpx.Retry(
        status_codes=[408, 429, 500, 502, 503, 504],
        methods=["GET", "POST"],
        max_retries=3,
        backoff_factor=0.5
    ),
    verify=ssl_context
)

# Client health check and reset lock
_client_lock = asyncio.Lock()

async def ensure_client_healthy():
    """
    Checks if the global async client is healthy and resets it if needed.
    Returns the global client, ensuring it's usable.
    """
    global async_client
    
    async with _client_lock:
        # Check if client needs to be reset
        if async_client.is_closed:
            logging.warning("HTTP client was closed, resetting it")
            try:
                await async_client.aclose()
            except Exception:
                pass
                
            # Recreate the client with the same parameters
            async_client = httpx.AsyncClient(
                timeout=30.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
                retry=httpx.Retry(
                    status_codes=[408, 429, 500, 502, 503, 504],
                    methods=["GET", "POST"],
                    max_retries=3,
                    backoff_factor=0.5
                ),
                verify=ssl_context
            )
            
    return async_client 
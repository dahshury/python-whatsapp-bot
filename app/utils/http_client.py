import asyncio
import logging
import ssl

import certifi
import httpx

# Build a standard SSL context using the certifi CA bundle
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

# Synchronous client for blocking calls (e.g., OpenAI)
# Add sane timeouts and connection pooling to avoid hangs and reduce latency
sync_client = httpx.Client(
    verify=ssl_context,
    timeout=httpx.Timeout(60.0, connect=10.0, read=60.0, write=30.0),
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
)

# Asynchronous client for async calls (e.g., WhatsApp API)
async_client = httpx.AsyncClient(
    timeout=httpx.Timeout(30.0, connect=10.0, read=30.0, write=30.0),
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
    verify=ssl_context,
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
                timeout=httpx.Timeout(30.0, connect=10.0, read=30.0, write=30.0),
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
                verify=ssl_context,
            )

    return async_client

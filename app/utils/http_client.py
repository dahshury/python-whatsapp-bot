import asyncio
import contextlib
import ssl

import certifi
import httpx

from app.infrastructure.logging import get_service_logger


# Set up domain-specific logger
logger = get_service_logger()


# Build a standard SSL context using the certifi CA bundle
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

# Synchronous client for blocking calls (e.g., OpenAI)
sync_client = httpx.Client(verify=ssl_context)

# Singleton pattern for HTTP client management
class AsyncClientManager:
    """Singleton manager for async HTTP client instances"""
    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._lock = asyncio.Lock()
        return cls._instance

    async def get_client(self):
        """Get or create the async HTTP client instance."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,  # Increased from 10.0 to 30.0 seconds
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
                verify=ssl_context,
            )
        return self._client

    async def ensure_client_healthy(self):
        """
        Checks if the async client is healthy and resets it if needed.
        Returns the client, ensuring it's usable.
        """
        async with self._lock:
            # Check if client needs to be reset
            if self._client and self._client.is_closed:
                logger.warning("HTTP client was closed, resetting it")
                with contextlib.suppress(Exception):
                    await self._client.aclose()

                # Recreate the client with the same parameters
                self._client = httpx.AsyncClient(
                    timeout=30.0,
                    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
                    verify=ssl_context,
                )
            elif self._client is None:
                self._client = httpx.AsyncClient(
                    timeout=30.0,
                    limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
                    verify=ssl_context,
                )

        return self._client


# Global manager instance
_client_manager = AsyncClientManager()

# Asynchronous client for async calls (e.g., WhatsApp API) - for backward compatibility
async_client = None  # Will be initialized on first access


async def ensure_client_healthy():
    """
    Checks if the global async client is healthy and resets it if needed.
    Returns the global client, ensuring it's usable.
    """
    manager = AsyncClientManager()
    client = await manager.ensure_client_healthy()
    return client

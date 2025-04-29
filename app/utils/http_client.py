import ssl
import certifi
import httpx

# Build a standard SSL context using the certifi CA bundle
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

# Synchronous client for blocking calls (e.g., OpenAI)
sync_client = httpx.Client(verify=ssl_context)

# Asynchronous client for async calls (e.g., WhatsApp API)
async_client = httpx.AsyncClient(
    timeout=10.0,
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
    verify=ssl_context
) 
import asyncio
import os
import sys
import tracemalloc

import uvicorn

from app import create_app
from app.infrastructure.logging import get_application_logger
from app.services.websocket_manager import websocket_manager


tracemalloc.start()


# Set up domain-specific logger
logger = get_application_logger()


# Use uvloop for better performance (Unix only)
try:
    import uvloop

    if sys.platform != "win32":
        asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    use_uvloop = True
except ImportError:
    use_uvloop = False

# Create app instance for use when not running with uvicorn CLI
app = create_app()


async def start_servers():
    """Start both FastAPI and WebSocket servers concurrently."""
    # Get WebSocket configuration from environment
    websocket_host = os.environ.get("WEBSOCKET_HOST", "0.0.0.0")
    websocket_port = int(os.environ.get("WEBSOCKET_PORT", "8765"))

    logger.info("🚀 Starting integrated backend servers...")
    logger.info("📡 FastAPI server: http://0.0.0.0:8000")
    logger.info("🔌 WebSocket server: ws://%s:%s", websocket_host, websocket_port)

    # Start WebSocket server in background
    websocket_task = asyncio.create_task(
        websocket_manager.start_server(websocket_host, websocket_port)
    )

    # Configure uvicorn
    config = uvicorn.Config(
        "run:app",
        host="0.0.0.0",
        port=8000,
        loop="uvloop" if use_uvloop and sys.platform != "win32" else "asyncio",
        log_level="info",
    )
    server = uvicorn.Server(config)

    # Start FastAPI server in background
    fastapi_task = asyncio.create_task(server.serve())

    logger.info("✅ Both servers started successfully!")

    # Run both servers concurrently
    try:
        await asyncio.gather(websocket_task, fastapi_task)
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down servers...")
        await websocket_manager.stop_server()
    except Exception:
        logger.exception("❌ Server error occurred")
        await websocket_manager.stop_server()
        raise


if __name__ == "__main__":
    logger.info("🏠 Starting PostgreSQL-powered backend with real-time WebSockets")
    try:
        asyncio.run(start_servers())
    except KeyboardInterrupt:
        logger.info("👋 Backend stopped by user")
    except Exception:
        logger.exception("💥 Fatal error occurred")
        sys.exit(1)

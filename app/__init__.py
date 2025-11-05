import logging
import os
import time
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager, suppress
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from app.auth.router import router as auth_router
from app.config import configure_logging, load_config
from app.scheduler import init_scheduler
from app.services.inbound_queue import spawn_workers, stop_workers
from app.utils.realtime import start_metrics_push_task, websocket_router
from app.views import router as webhook_router

# Define metrics at module level to prevent duplicate registration
REQUEST_COUNT = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint", "http_status"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"])


def create_app() -> FastAPI:
    configure_logging()
    load_config()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        pid = os.getpid()
        logging.info(f"startup: initializing database tables in pid {pid}")
        from app.db import init_models

        init_models()
        logging.info(f"startup: initializing scheduler in pid {pid}")
        init_scheduler(app)
        # Start inbound queue workers (configurable via env, default few workers for low memory)
        try:
            num_workers = int(os.environ.get("INBOUND_QUEUE_WORKERS", "2"))
        except Exception:
            num_workers = 2
        stop_event, tasks = spawn_workers(max(1, num_workers))
        app.state.inbound_queue_stop_event = stop_event
        app.state.inbound_queue_tasks = tasks
        yield
        # Shutdown: close HTTP clients
        logging.info("shutdown: closing HTTP clients")
        from app.utils.http_client import async_client, sync_client

        await async_client.aclose()
        sync_client.close()
        # Stop inbound queue workers
        with suppress(Exception):
            await stop_workers(app.state.inbound_queue_stop_event, app.state.inbound_queue_tasks)

    app = FastAPI(default_response_class=ORJSONResponse, lifespan=lifespan)

    # Configure CORS
    origins = [
        "http://localhost",
        "http://localhost:8080",  # Common port for live-server or similar dev servers
        "http://127.0.0.1:8080",  # Adding the specific IP-based origin
        "http://localhost:3831",  # React dev server port
        "http://127.0.0.1:3831",  # React dev server IP-based origin
        "http://localhost:16532",  # Common React dev server port
        "http://127.0.0.1:16532",  # Common React dev server IP-based origin
        "http://localhost:3000",  # Next.js dev/production port
        "http://127.0.0.1:3000",  # Next.js dev/production port (IP-based)
        "null",  # Allow requests from file:/// URLs (for local testing)
    ]
    
    # Add production frontend origin from environment if set
    production_frontend = os.getenv("APP_URL")
    if production_frontend:
        # Strip trailing slash if present
        production_frontend = production_frontend.rstrip("/")
        if production_frontend not in origins:
            origins.append(production_frontend)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allows all methods
        allow_headers=["*"],  # Allows all headers
    )

    # Add GZip compression for large JSON payloads (documents, etc.)
    # Responses > 500 bytes will be compressed (reduces 141KB documents significantly)
    app.add_middleware(GZipMiddleware, minimum_size=500)

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next: Callable[[Request], Any]):
        start_time = time.time()
        response = await call_next(request)
        elapsed = time.time() - start_time
        try:
            # Safely handle URL paths that might cause parsing errors
            path = str(request.url.path)
            # Normalize the path to avoid issues with invalid characters
            if "[" in path or "]" in path:
                # Replace problematic IPv6 URL characters or sanitize path
                path = "/__sanitized_path__"

            REQUEST_LATENCY.labels(request.method, path).observe(elapsed)
            REQUEST_COUNT.labels(request.method, path, response.status_code).inc()
        except Exception as e:
            logging.warning(f"Metrics instrumentation failed: {e}")
        return response

    @app.get("/metrics")
    async def metrics() -> Response:
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    # Include HTTP routers
    app.include_router(webhook_router)
    app.include_router(auth_router)
    # Include WebSocket router
    app.include_router(websocket_router)

    # Start background metrics push to websocket clients
    start_metrics_push_task(app)
    return app

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.config import configure_logging, load_config
from app.views import router as webhook_router
from app.scheduler import init_scheduler

import time
from fastapi import Request, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST, REGISTRY
import os
import logging
from contextlib import asynccontextmanager

# Define metrics at module level to prevent duplicate registration
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'http_status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])

def create_app():
    configure_logging()
    load_config()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        pid = os.getpid()
        logging.info(f"startup: initializing scheduler in pid {pid}")
        init_scheduler(app)
        yield
        # Shutdown: close HTTP clients
        logging.info("shutdown: closing HTTP clients")
        from app.utils.http_client import async_client, sync_client
        await async_client.aclose()
        sync_client.close()

    app = FastAPI(default_response_class=ORJSONResponse, lifespan=lifespan)

    # Configure CORS
    origins = [
        "http://localhost",
        "http://localhost:8080", # Common port for live-server or similar dev servers
        "http://127.0.0.1:8080", # Adding the specific IP-based origin
        "http://localhost:3831", # React dev server port
        "http://127.0.0.1:3831", # React dev server IP-based origin
        "http://localhost:16532", # Common React dev server port
        "http://127.0.0.1:16532", # Common React dev server IP-based origin
        "null",  # Allow requests from file:/// URLs (for local testing)
        # Add any other origins your frontend might be served from, e.g., a deployed URL
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],  # Allows all methods
        allow_headers=["*"],  # Allows all headers
    )

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        elapsed = time.time() - start_time
        try:
            # Safely handle URL paths that might cause parsing errors
            path = str(request.url.path)
            # Normalize the path to avoid issues with invalid characters
            if '[' in path or ']' in path:
                # Replace problematic IPv6 URL characters or sanitize path
                path = "/__sanitized_path__"
                
            REQUEST_LATENCY.labels(request.method, path).observe(elapsed)
            REQUEST_COUNT.labels(request.method, path, response.status_code).inc()
        except Exception as e:
            logging.warning(f"Metrics instrumentation failed: {e}")
        return response

    @app.get("/metrics")
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(webhook_router)
    return app
from fastapi import FastAPI
from fastapi.responses import ORJSONResponse
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

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        REQUEST_LATENCY.labels(request.method, request.url.path).observe(time.time() - start_time)
        REQUEST_COUNT.labels(request.method, request.url.path, response.status_code).inc()
        return response

    @app.get("/metrics")
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    app.include_router(webhook_router)
    return app
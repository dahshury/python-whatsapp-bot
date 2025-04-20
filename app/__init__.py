from fastapi import FastAPI
from app.config import configure_logging
from app.views import router as webhook_router
from app.scheduler import init_scheduler

import time
from fastapi import Request, Response
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

def create_app():
    configure_logging()
    app = FastAPI()

    # Instrumentation: Prometheus metrics
    REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'http_status'])
    REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])

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
    # start background jobs (e.g., send reminders)
    init_scheduler(app)
    return app
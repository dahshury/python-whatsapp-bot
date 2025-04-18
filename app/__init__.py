from fastapi import FastAPI
from app.config import configure_logging
from app.views import router as webhook_router
from app.scheduler import init_scheduler

def create_app():
    configure_logging()
    app = FastAPI()
    app.include_router(webhook_router)
    # start background jobs (e.g., send reminders)
    init_scheduler(app)
    return app
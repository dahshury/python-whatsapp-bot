from fastapi import FastAPI
from app.config import configure_logging
from app.views import router as webhook_router

def create_app():
    configure_logging()
    app = FastAPI()
    app.include_router(webhook_router)
    return app
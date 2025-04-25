import logging
import uvicorn
import uvloop
import asyncio
from app import create_app

# Use uvloop for better performance
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

# Create app instance for use when not running with uvicorn CLI
app = create_app()

if __name__ == "__main__":
    logging.info("FastAPI app started")
    # When using reload=True, you must use an import string instead of an app instance
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True, loop="uvloop")

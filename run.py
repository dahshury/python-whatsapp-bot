import asyncio
import logging
import tracemalloc

import uvicorn
import uvloop

from app import create_app

tracemalloc.start()

# Use uvloop for better performance
asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())

# Create app instance for use when not running with uvicorn CLI
app = create_app()

if __name__ == "__main__":
    logging.info("FastAPI app started")
    uvicorn.run(
        "run:app",
        host="0.0.0.0",
        port=8000,
        loop="uvloop",
        proxy_headers=True,
        forwarded_allow_ips="*",
    )

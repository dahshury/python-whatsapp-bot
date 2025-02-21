import logging
import uvicorn
from app import create_app

app = create_app()

if __name__ == "__main__":
    logging.info("FastAPI app started")
    uvicorn.run("run:app", host="0.0.0.0", port=8000, reload=True)

import os
from dotenv import load_dotenv
import logging
import sys

load_dotenv()

config = {
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
    "OPENAI_ASSISTANT_ID": os.getenv("OPENAI_ASSISTANT_ID"),
    "VEC_STORE_ID": os.getenv("VEC_STORE_ID"),
    "ACCESS_TOKEN": os.getenv("ACCESS_TOKEN"),
    "YOUR_PHONE_NUMBER": os.getenv("YOUR_PHONE_NUMBER"),
    "APP_ID": os.getenv("APP_ID"),
    "APP_SECRET": os.getenv("APP_SECRET"),
    "RECIPIENT_WAID": os.getenv("RECIPIENT_WAID"),
    "VERSION": os.getenv("VERSION"),
    "PHONE_NUMBER_ID": os.getenv("PHONE_NUMBER_ID"),
    "VERIFY_TOKEN": os.getenv("VERIFY_TOKEN"),
    "BUSINESS_LONGITUDE": os.getenv("BUSINESS_LONGITUDE"),
    "BUSINESS_LATITUDE": os.getenv("BUSINESS_LATITUDE"),
    "BUSINESS_NAME": os.getenv("BUSINESS_NAME"),
    "BUSINESS_ADDRESS": os.getenv("BUSINESS_ADDRESS"),
}

def configure_logging():
    logging.basicConfig(
        level=logging.info,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
    )

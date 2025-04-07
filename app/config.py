import os
from dotenv import load_dotenv
import logging
import sys

load_dotenv(override=True, encoding="utf-8")

config = {
    "SYSTEM_PROMPT": os.getenv("SYSTEM_PROMPT"),
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
    "OPENAI_ASSISTANT_ID": os.getenv("OPENAI_ASSISTANT_ID"),
    "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
    "VEC_STORE_ID": os.getenv("VEC_STORE_ID"),
    "ACCESS_TOKEN": os.getenv("ACCESS_TOKEN"),
    "YOUR_PHONE_NUMBER": os.getenv("YOUR_PHONE_NUMBER"),
    "APP_ID": os.getenv("APP_ID"),
    "APP_URL": os.getenv("APP_URL"),
    "APP_SECRET": os.getenv("APP_SECRET"),
    "VERSION": os.getenv("VERSION"),
    "PHONE_NUMBER_ID": os.getenv("PHONE_NUMBER_ID"),
    "VERIFY_TOKEN": os.getenv("VERIFY_TOKEN"),
    "BUSINESS_LONGITUDE": os.getenv("BUSINESS_LONGITUDE"),
    "BUSINESS_LATITUDE": os.getenv("BUSINESS_LATITUDE"),
    "BUSINESS_NAME": os.getenv("BUSINESS_NAME"),
    "BUSINESS_ADDRESS": os.getenv("BUSINESS_ADDRESS"),
    "UNSUPPORTED_MEDIA_MESSAGE": os.getenv("UNSUPPORTED_MEDIA_MESSAGE"),
    "VACATION_START_DATES": os.getenv("VACATION_START_DATES"),
    "VACATION_DURATIONS": os.getenv("VACATION_DURATIONS"),
    "VACATION_MESSAGE": os.getenv("VACATION_MESSAGE"),
}

def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        stream=sys.stdout,
    )

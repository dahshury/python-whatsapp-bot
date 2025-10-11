import logging
import os
import sys

from dotenv import load_dotenv


def load_config() -> None:
    # Don't override environment variables that are already set (e.g., from Docker compose)
    # This ensures DATABASE_URL set by the container isn't replaced by .env values like localhost
    load_dotenv(override=False, encoding="utf-8")


load_config()

config: dict[str, str | None] = {
    "PHONE_NUMBER_ID": os.getenv("PHONE_NUMBER_ID"),
    "ACCESS_TOKEN": os.getenv("ACCESS_TOKEN"),
    "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
    "APP_ID": os.getenv("APP_ID"),
    "APP_SECRET": os.getenv("APP_SECRET"),
    "APP_URL": os.getenv("APP_URL"),
    "VERIFY_TOKEN": os.getenv("VERIFY_TOKEN"),
    "VERSION": os.getenv("VERSION"),
    "BUSINESS_ADDRESS": os.getenv("BUSINESS_ADDRESS"),
    "BUSINESS_LATITUDE": os.getenv("BUSINESS_LATITUDE"),
    "BUSINESS_LONGITUDE": os.getenv("BUSINESS_LONGITUDE"),
    "BUSINESS_NAME": os.getenv("BUSINESS_NAME"),
    "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
    "LLM_PROVIDER": os.getenv("LLM_PROVIDER", "anthropic"),
    "OPENAI_ASSISTANT_ID": os.getenv("OPENAI_ASSISTANT_ID"),
    "VEC_STORE_ID": os.getenv("VEC_STORE_ID"),
    "SYSTEM_PROMPT": os.getenv("SYSTEM_PROMPT"),
    "TIMEZONE": os.getenv("TIMEZONE", "Asia/Riyadh"),
    "UNSUPPORTED_MEDIA_MESSAGE": os.getenv("UNSUPPORTED_MEDIA_MESSAGE"),
    "VACATION_MESSAGE": os.getenv("VACATION_MESSAGE"),
}


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    # Silence verbose APScheduler INFO logs
    logging.getLogger("apscheduler").setLevel(logging.WARNING)
    # Silence OpenAI client debug logs and HTTPX library logs
    logging.getLogger("openai").setLevel(logging.WARNING)
    logging.getLogger("openai._base_client").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    # Silence Uvicorn HTTP access logs (quiet GET /metrics and other access)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def update_env_variable(key: str, value: str) -> bool:
    """
    Updates a single environment variable in the .env file

    Args:
        key (str): The environment variable name
        value (str): The new value to set
    """
    # Get the .env file path
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")

    # Check if .env file exists
    if not os.path.exists(env_path):
        logging.error(f".env file not found at {env_path}")
        return False

    # Read the current .env file
    with open(env_path, encoding="utf-8") as file:
        lines = file.readlines()

    # Find and update the specific variable
    updated = False
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f'{key}="{value}"\n'
            updated = True
            break

    # If the variable doesn't exist, add it
    if not updated:
        lines.append(f'{key}="{value}"\n')

    # Write the updated content back to the .env file
    with open(env_path, "w", encoding="utf-8") as file:
        file.writelines(lines)

    # Also update the in-memory config
    config[key] = value
    # Update the environment variable in the current process
    os.environ[key] = value

    return True


def update_vacation_settings(start_date: str | None, end_date: str | None, message: str | None) -> tuple[bool, str]:
    # Deprecated: vacations now stored in DB only. Keep VACATION_MESSAGE support.
    if message:
        update_env_variable("VACATION_MESSAGE", message)
    return True, "Vacation message updated"


from typing import Any


def get(key: str | list[str], default: Any = None) -> Any:
    """
    Get a configuration value by key, with an optional default value.

    Args:
        key (str or list): The configuration key or a list of keys to try in order
        default: The default value to return if the key is not found

    Returns:
        The configuration value or the default value
    """
    if isinstance(key, list):
        for k in key:
            value = config.get(k)
            if value is not None:
                return value
        return default

    return config.get(key, default)

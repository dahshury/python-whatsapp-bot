import os
from dotenv import load_dotenv
import logging
import sys

load_dotenv(override=True, encoding="utf-8")

config = {
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
    "TIMEZONE": os.getenv("TIMEZONE"),
    "UNSUPPORTED_MEDIA_MESSAGE": os.getenv("UNSUPPORTED_MEDIA_MESSAGE"),
    
    "VACATION_DURATIONS": os.getenv("VACATION_DURATIONS"),
    "VACATION_MESSAGE": os.getenv("VACATION_MESSAGE"),
    "VACATION_START_DATES": os.getenv("VACATION_START_DATES"),
    
}

def configure_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    # Silence verbose APScheduler INFO logs
    logging.getLogger('apscheduler').setLevel(logging.WARNING)
    # Silence OpenAI client debug logs and HTTPX library logs
    logging.getLogger('openai').setLevel(logging.WARNING)
    logging.getLogger('openai._base_client').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    # Silence Uvicorn HTTP access logs (quiet GET /metrics and other access)  
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)

def update_env_variable(key, value):
    """
    Updates a single environment variable in the .env file
    
    Args:
        key (str): The environment variable name
        value (str): The new value to set
    """
    # Get the .env file path
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    
    # Check if .env file exists
    if not os.path.exists(env_path):
        logging.error(f".env file not found at {env_path}")
        return False
    
    # Read the current .env file
    with open(env_path, 'r', encoding='utf-8') as file:
        lines = file.readlines()
    
    # Find and update the specific variable
    updated = False
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}="):
            lines[i] = f"{key}=\"{value}\"\n"
            updated = True
            break
    
    # If the variable doesn't exist, add it
    if not updated:
        lines.append(f"{key}=\"{value}\"\n")
    
    # Write the updated content back to the .env file
    with open(env_path, 'w', encoding='utf-8') as file:
        file.writelines(lines)
    
    # Also update the in-memory config
    config[key] = value
    # Update the environment variable in the current process
    os.environ[key] = value
    
    return True

def update_vacation_settings(start_date, end_date, message):
    """
    Updates vacation settings in the .env file
    
    Args:
        start_date (str): Vacation start date in YYYY-MM-DD format
        end_date (str): Vacation end date in YYYY-MM-DD format
        message (str): Vacation message
    """
    if start_date and end_date:
        # Calculate duration in days
        from datetime import datetime
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        duration = (end - start).days
        
        # Update the environment variables
        update_env_variable("VACATION_START_DATES", start_date)
        update_env_variable("VACATION_DURATIONS", str(duration))
        if message:
            update_env_variable("VACATION_MESSAGE", message)
        
        return True, f"Vacation settings updated: {start_date} to {end_date} ({duration} days)"
    
    return False, "Invalid dates provided"

def get(key, default=None):
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

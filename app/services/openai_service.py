import os
import time
import logging
import datetime
import shelve
import asyncio
from zoneinfo import ZoneInfo  # Requires Python 3.9+
from hijri_converter import convert
import ssl
import certifi
import httpx
from app.config import config
from openai import OpenAI

OPENAI_API_KEY = config["OPENAI_API_KEY"]
OPENAI_ASSISTANT_ID = config["OPENAI_ASSISTANT_ID"]

ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

http_client = httpx.Client(verify=ssl_context)
client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)

# Global in-memory dictionary to store asyncio locks per user (wa_id)
global_locks = {}

def get_lock(wa_id):
    """
    Retrieve or create an asyncio.Lock for the given WhatsApp ID.
    Also record a flag in the shelve under the key "locks" for tracking.
    """
    if wa_id not in global_locks:
        global_locks[wa_id] = asyncio.Lock()
        # Record in the shelve that a lock exists for this user.
        with shelve.open("threads_db", writeback=True) as threads_shelf:
            if "locks" not in threads_shelf:
                threads_shelf["locks"] = {}
            threads_shelf["locks"][wa_id] = True
            threads_shelf.sync()
    return global_locks[wa_id]

def check_if_thread_exists(wa_id):
    """
    Check if a conversation thread exists for the given WhatsApp ID.
    """
    with shelve.open("threads_db") as threads_shelf:
        entry = threads_shelf.get(wa_id, None)
        if entry is not None:
            return entry.get('thread_id')
        return None

def store_thread(wa_id, thread_id):
    """
    Create a new conversation entry for the given WhatsApp ID.
    """
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        threads_shelf[wa_id] = {'thread_id': thread_id, 'conversation': []}
        threads_shelf.sync()

def append_message(wa_id, role, message, date_str, time_str):
    """
    Append a message to the conversation history for the given WhatsApp ID.
    """
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        if wa_id in threads_shelf:
            threads_shelf[wa_id]['conversation'].append({
                'role': role,
                'message': message,
                'date': date_str,
                'time': time_str
            })
        else:
            threads_shelf[wa_id] = {
                'thread_id': None,
                'conversation': [{
                    'role': role,
                    'message': message,
                    'date': date_str,
                    'time': time_str
                }]
            }
        threads_shelf.sync()

def run_assistant(thread, name, timeout=60):
    """
    Run the assistant and poll until the run is complete or a timeout is reached.
    Returns the generated message along with date and time, or None if an error occurs.
    """
    assistant = client.beta.assistants.retrieve(OPENAI_ASSISTANT_ID)
    start_time = time.time()
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id,
    )
    
    # Poll until the run status is no longer queued or in_progress
    while run.status in ["queued", "in_progress"]:
        # Break out if polling takes too long
        if time.time() - start_time > timeout:
            logging.error(f"Run timed out for {name}")
            return None, None, None
        asyncio.sleep(2)  # Could also consider exponential backoff here
        run = client.beta.threads.runs.retrieve(
            thread_id=thread.id,
            run_id=run.id
        )
        
    if run.status == "completed":
        messages = client.beta.threads.messages.list(thread_id=thread.id)
        date_str, time_str = parse_unix_timestamp(messages.data[0].created_at)
        new_message = messages.data[0].content[0].text.value
        logging.info(f"Generated message for {name}: {new_message}")
        return new_message, date_str, time_str
    else:
        logging.error(f"Run failed for {name}: {run.last_error}")
        return None, None, None
    
def get_current_time():
    """
    Get the current time in both Hijri and Gregorian calendars.
    Returns a tuple with both date and time.
    """
    now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
    gregorian_date_str = now.strftime("%Y-%m-%d")
    gregorian_time_str = now.strftime("%H:%M")
    
    hijri_date = convert.Gregorian(now.year, now.month, now.day).to_hijri()
    hijri_date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
    
    return (gregorian_date_str, gregorian_time_str), (hijri_date_str, gregorian_time_str)

def parse_unix_timestamp(timestamp, to_hijri=False):
    """
    Convert a Unix timestamp to formatted date and time strings.
    """
    timestamp = int(timestamp)
    dt_utc = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
    saudi_timezone = ZoneInfo("Asia/Riyadh")
    dt_saudi = dt_utc.astimezone(saudi_timezone)
    
    if to_hijri:
        hijri_date = convert.Gregorian(dt_saudi.year, dt_saudi.month, dt_saudi.day).to_hijri()
        date_str = f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}"
    else:
        date_str = dt_saudi.strftime("%Y-%m-%d")
    
    time_str = dt_saudi.strftime("%H:%M")
    return date_str, time_str

async def generate_response(message_body, wa_id, name, timestamp):
    """
    Generate a response from the assistant and update the conversation.
    Uses a per-user lock to ensure that concurrent calls for the same user
    do not run simultaneously. Implements a retry loop when adding a user message
    if the thread is busy with an active run.
    """
    lock = get_lock(wa_id)
    async with lock:
        date_str, time_str = parse_unix_timestamp(timestamp)
        thread_id = check_if_thread_exists(wa_id)
        if thread_id is None:
            logging.info(f"Creating new thread for {name} with wa_id {wa_id}")
            thread = client.beta.threads.create()
            thread_id = thread.id
            store_thread(wa_id, thread_id)
        else:
            logging.info(f"Retrieving existing thread for {name} with wa_id {wa_id}")
            thread = client.beta.threads.retrieve(thread_id)
        
        # Append the user's message to our local conversation history.
        append_message(wa_id, 'user', message_body, date_str, time_str)
        
        # Retry loop to add the user's message to the OpenAI thread.
        MAX_RETRIES = 60
        RETRY_DELAY = 2  # seconds
        retries = 0
        while retries < MAX_RETRIES:
            try:
                client.beta.threads.messages.create(
                    thread_id=thread_id,
                    role="user",
                    content=message_body,
                )
                break  # success: exit the retry loop
            except Exception as e:
                error_str = str(e)
                if "while a run" in error_str:
                    logging.warning(
                        f"Thread busy for {name}, retrying in {RETRY_DELAY} seconds... (attempt {retries + 1})"
                    )
                    asyncio.sleep(RETRY_DELAY)
                    retries += 1
                else:
                    # Raise other errors immediately
                    raise e
        if retries == MAX_RETRIES:
            logging.error(f"Failed to add user message after {MAX_RETRIES} retries for {name}")
            return None

        # Run the blocking OpenAI API call in an executor so as not to block the event loop.
        new_message, assistant_date_str, assistant_time_str = await asyncio.get_event_loop().run_in_executor(
            None, run_assistant, thread, name
        )
        append_message(wa_id, 'assistant', new_message, assistant_date_str, assistant_time_str)
        return new_message
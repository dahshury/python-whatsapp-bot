from openai import OpenAI
import shelve
from dotenv import load_dotenv
import os
import time
import logging
import datetime
from zoneinfo import ZoneInfo  # Requires Python 3.9+

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_ASSISTANT_ID = os.getenv("OPENAI_ASSISTANT_ID")
import ssl
import certifi
import httpx
from openai import OpenAI

ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

http_client = httpx.Client(verify=ssl_context)

client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)

# Use context manager to ensure the shelf file is closed properly
def check_if_thread_exists(wa_id):
    """
    Check if a conversation thread exists for the given WhatsApp ID.
    The shelf stores a dictionary with keys 'thread_id' and 'conversation'.
    """
    with shelve.open("threads_db") as threads_shelf:
        entry = threads_shelf.get(wa_id, None)  # Retrieve the entry for the given wa_id
        if entry is not None:
            return entry.get('thread_id')  # Return the stored thread_id
        return None  # No conversation exists yet

def store_thread(wa_id, thread_id):
    """
    Create a new conversation entry for the given WhatsApp ID.
    Initializes the conversation history as an empty list.
    """
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        # Store a dictionary with the thread_id and an empty conversation list
        threads_shelf[wa_id] = {'thread_id': thread_id, 'conversation': []}
        threads_shelf.sync()  # Ensure the data is written to disk
        
def append_message(wa_id, role, message, date_str, time_str):
    """
    Append a message to the conversation history for the given WhatsApp ID.
    The conversation is stored as a list of dictionaries, each containing the role and message text.
    """
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        if wa_id in threads_shelf:
            # Append to the existing conversation list
            threads_shelf[wa_id]['conversation'].append({'role': role, 'message': message, 'date':date_str, time:time_str})
        else:
            # If no conversation exists, create a new entry with no thread_id and one message
            threads_shelf[wa_id] = {'thread_id': None, 'conversation': [{'role': role, 'message': message, 'date':date_str, time:time_str}]}
        threads_shelf.sync()  # Flush changes to disk
    
def run_assistant(thread, name):
    # Retrieve the Assistant
    assistant = client.beta.assistants.retrieve(OPENAI_ASSISTANT_ID)

    # Run the assistant
    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=assistant.id,
        # instructions=f"You are having a conversation with {name}",
    )

    # Wait for completion
    # https://platform.openai.com/docs/assistants/how-it-works/runs-and-run-steps#:~:text=under%20failed_at.-,Polling%20for%20updates,-In%20order%20to
    while run.status != "completed":
        # Be nice to the API
        time.sleep(0.5)
        run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

    # Retrieve the Messages
    messages = client.beta.threads.messages.list(thread_id=thread.id)
    # Extract the date and time as HH:MM from the ISO 8601 timestamp
    iso_timestamp = messages.data[0].created_at
    dt = datetime.datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
    date_str = dt.strftime("%Y-%m-%d")
    time_str = dt.strftime("%H:%M")
    new_message = messages.data[0].content[0].text.value
    logging.info(f"Generated message: {new_message}")
    return new_message, date_str, time_str

def parse_timestamp(timestamp):
    # timestamp = int(timestamp)

    # # 2. Create a timezone-aware datetime object in UTC
    # dt_utc = datetime.datetime.fromtimestamp(timestamp, tz=datetime.timezone.utc)
    
    # # 3. Convert the UTC datetime to Saudi Arabia time using ZoneInfo
    # saudi_timezone = ZoneInfo("Asia/Riyadh")
    # dt_saudi = dt_utc.astimezone(saudi_timezone)
    # date_str = dt_saudi.strftime("%Y-%m-%d")
    # time_str = dt_saudi.strftime("%H:%M")
    return "2025-02-08", "03:37"

def generate_response(message_body, wa_id, name, timestamp):
    """
    Generate a response from the assistant and save the conversation.
    This function:
      1. Checks for an existing conversation thread.
      2. Creates a new thread if necessary.
      3. Appends the user's message to the conversation.
      4. Sends the message to the assistant and retrieves a response.
      5. Appends the assistant's response to the conversation.
    """
    # Check if a thread exists for this WhatsApp ID
    date_str, time_str = parse_timestamp(timestamp)
    thread_id = check_if_thread_exists(wa_id)
    if thread_id is None:
        logging.info(f"Creating new thread for {name} with wa_id {wa_id}")
        # Create a new thread using the OpenAI client (assume client.beta.threads.create() returns a thread with an id)
        thread = client.beta.threads.create()
        thread_id = thread.id
        store_thread(wa_id, thread_id)  # Save the new thread and initialize conversation history
    else:
        logging.info(f"Retrieving existing thread for {name} with wa_id {wa_id}")
        thread = client.beta.threads.retrieve(thread_id)
    
    # Append the user's message to the conversation history
    append_message(wa_id, 'user', message_body, date_str, time_str)
    
    # Add the user's message to the thread (if needed by your API)
    message = client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=message_body,
    )
    
    # Run the assistant to generate a response (this function polls until the response is ready)
    new_message, assistant_date_str, assistant_time_str = run_assistant(thread, name)
    
    # Append the assistant's response to the conversation history
    append_message(wa_id, 'assistant', new_message, assistant_date_str, assistant_time_str)
    
    return new_message
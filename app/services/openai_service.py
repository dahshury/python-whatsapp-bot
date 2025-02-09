from openai import OpenAI
import shelve
from dotenv import load_dotenv
import os
import time
import logging

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


# def upload_file(path):
#     # Upload a file with an "assistants" purpose
#     file = client.files.create(
#         file=open("../../data/airbnb-faq.pdf", "rb"), purpose="assistants"
#     )


# def create_assistant(file):
#     """
#     You currently cannot set the temperature for Assistant via the API.
#     """
#     assistant = client.beta.assistants.create(
#         name="WhatsApp AirBnb Assistant",
#         instructions="You're a helpful WhatsApp assistant that can assist guests that are staying in our Paris AirBnb. Use your knowledge base to best respond to customer queries. If you don't know the answer, say simply that you cannot help with question and advice to contact the host directly. Be friendly and funny.",
#         tools=[{"type": "retrieval"}],
#         model="gpt-4-1106-preview",
#         file_ids=[file.id],
#     )
#     return assistant


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
        
def append_message(wa_id, role, message, timestamp=None):
    """
    Append a message to the conversation history for the given WhatsApp ID.
    The conversation is stored as a list of dictionaries, each containing the role and message text.
    """
    with shelve.open("threads_db", writeback=True) as threads_shelf:
        if wa_id in threads_shelf:
            # Append to the existing conversation list
            threads_shelf[wa_id]['conversation'].append({'role': role, 'message': message})
        else:
            # If no conversation exists, create a new entry with no thread_id and one message
            threads_shelf[wa_id] = {'thread_id': None, 'conversation': [{'role': role, 'message': message}]}
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
    new_message = messages.data[0].content[0].text.value
    logging.info(f"Generated message: {new_message}")
    return new_message

def generate_response(message_body, wa_id, name):
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
    append_message(wa_id, 'user', message_body)
    
    # Add the user's message to the thread (if needed by your API)
    message = client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=message_body,
    )
    
    # Run the assistant to generate a response (this function polls until the response is ready)
    new_message = run_assistant(thread, name)
    
    # Append the assistant's response to the conversation history
    append_message(wa_id, 'assistant', new_message)
    
    return new_message
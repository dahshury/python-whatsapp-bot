import logging
import shelve
import asyncio
import json
import ssl
import certifi
import httpx
from app.config import config
from openai import OpenAI
from app.utils import get_lock, check_if_thread_exists, store_thread, parse_unix_timestamp
import inspect
from app.services import assistant_functions

OPENAI_API_KEY = config["OPENAI_API_KEY"]
OPENAI_ASSISTANT_ID = config["OPENAI_ASSISTANT_ID"]

ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

http_client = httpx.Client(verify=ssl_context)
client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)
   
# Dynamically create FUNCTION_MAPPING functions in assistant_functions
FUNCTION_MAPPING = {
    name: func for name, func in inspect.getmembers(assistant_functions)
    if inspect.isfunction(func)
}

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
        

def run_assistant(thread, name, max_iterations=10):
    """
    Run the assistant and poll until the run is complete or a timeout is reached.
    Supports submitting tool outputs via submit_tool_outputs_and_poll.
    Returns the generated message along with date and time, or None if an error occurs.
    """
    assistant = client.beta.assistants.retrieve(OPENAI_ASSISTANT_ID)
    
    # Create the initial run and wait for it to complete.
    run = client.beta.threads.runs.create_and_poll(
        thread_id=thread.id,
        assistant_id=assistant.id,
    )
    
    if run.status not in ["completed", "requires_action"]:
        logging.error(f"Run failed for {name}: {run.last_error}")
        return None, None, None


    iteration = 0
    # Check if there is a required action for tool outputs.
    while (hasattr(run, "required_action") and 
        hasattr(run.required_action, "submit_tool_outputs") and 
        run.required_action.submit_tool_outputs.tool_calls) and iteration < max_iterations:
        # Prepare to collect tool outputs if the run requires any.
        tool_outputs = []
        iteration += 1
        
        # Loop through each tool call requested by the assistant.
        for tool in run.required_action.submit_tool_outputs.tool_calls:
            if tool.function.name in FUNCTION_MAPPING:
                # Extract arguments if any (expected to be a JSON string).
                raw_args = getattr(tool.function, "arguments", "{}")
                try:
                    parsed_args = json.loads(raw_args)
                except Exception as e:
                    logging.error(f"Error parsing arguments for function 'get_current_time': {e}")
                    parsed_args = {}
                
                # Execute the function with the parsed arguments.
                output = FUNCTION_MAPPING[tool.function.name](**parsed_args)
                tool_outputs.append({
                    "tool_call_id": tool.id,
                    "output": output  # Ensure this is a string or properly serialized
                })
            # Add additional tool calls here as needed.
    
        # If any tool outputs were collected, submit them.
        if tool_outputs:
            try:
                run = client.beta.threads.runs.submit_tool_outputs_and_poll(
                    thread_id=thread.id,
                    run_id=run.id,
                    tool_outputs=tool_outputs
                )
                logging.info("Tool outputs submitted successfully.")
            except Exception as e:
                logging.error(f"Failed to submit tool outputs for {name}: {e}")
                return None, None, None
        else:
            logging.info("No tool outputs to submit.")

        # After submitting tool outputs (or if there were none), check for final reply.
        if run.status == "completed":
            messages = client.beta.threads.messages.list(thread_id=thread.id)
            latest_message = messages.data[0].content[0]
            date_str, time_str = parse_unix_timestamp(messages.data[0].created_at)
            new_message = latest_message.text.value
            logging.info(f"Generated message for {name}: {new_message}")
            return new_message, date_str, time_str
        elif run.status == "requires_action":
            continue
        else:
            logging.error(f"Run status is not completed, status: {run.status}")
            return None, None, None

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
            thread = client.beta.threads.create(
                tool_resources={
                            "file_search": {
                                "vector_store_ids": [config["VEC_STORE_ID"]]
                            }
                        }
                    )
            thread_id = thread.id
            store_thread(wa_id, thread_id)
        else:
            logging.info(f"Retrieving existing thread for {name} with wa_id {wa_id}")
            thread = client.beta.threads.retrieve(thread_id)
        
        # Append the user's message to our local conversation history.
        append_message(wa_id, 'user', message_body, date_str, time_str)
        
        # Retry loop to add the user's message to the OpenAI thread.
        MAX_RETRIES = 20
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
                    await asyncio.sleep(RETRY_DELAY)
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
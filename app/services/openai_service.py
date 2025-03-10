import logging
import shelve
import asyncio
import json
import ssl
import certifi
import httpx
import inspect
from app.config import config
from openai import OpenAI
from app.utils import get_lock, check_if_thread_exists, make_thread, parse_unix_timestamp, append_message, process_text_for_whatsapp, send_whatsapp_message
from app.decorators import retry_decorator
from app.services import assistant_functions
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import httpx

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

@retry_decorator
def safe_retrieve_thread(thread_id):
    return client.beta.threads.retrieve(thread_id)

@retry_decorator
def safe_create_message(thread_id, role, content):
    """
    Create a message in the OpenAI thread with error handling.
    """
    try:
        return client.beta.threads.messages.create(
            thread_id=thread_id,
            role=role,
            content=content
        )
    except Exception as e:
        logging.error(f"Error creating message: {e}")
        return None

def run_assistant(wa_id, thread, name, max_iterations=10):
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

    # Prepare to collect tool outputs if the run requires any.
    tool_outputs = []
    # Check if there is a required action for tool outputs.
    if (hasattr(run, "required_action") and 
        hasattr(run.required_action, "submit_tool_outputs") and 
        run.required_action.submit_tool_outputs.tool_calls):
        
        # Loop through each tool call requested by the assistant.
        for tool in run.required_action.submit_tool_outputs.tool_calls:
            if tool.function.name in FUNCTION_MAPPING:
                # Get the function reference from FUNCTION_MAPPING.
                function = FUNCTION_MAPPING[tool.function.name]
                # Inspect the function's signature.
                sig = inspect.signature(function)
                
                # Extract arguments if any (expected to be a JSON string).
                raw_args = getattr(tool.function, "arguments", "{}")
                try:
                    parsed_args = json.loads(raw_args)
                except Exception as e:
                    logging.error(f"Error parsing arguments for function {tool.function.name}: {e}")
                    parsed_args = {}
                
                # If the function takes a 'wa_id' parameter, add it to parsed_args.
                if 'wa_id' in sig.parameters and not parsed_args.get('wa_id', ""):
                    parsed_args['wa_id'] = wa_id
                
                try:
                    # Execute the function with the parsed arguments.
                    output = json.dumps(function(**parsed_args))
                except Exception as e:
                    logging.error(f"Error executing function {tool.function.name}: {e}")
                    return None, None, None
                    
                tool_outputs.append({
                    "tool_call_id": tool.id,
                    "output": output  # Ensure this is a string or properly serialized
                })
            else:
                logging.error(f"Function '{tool.function.name}' not implemented.")
                return None, None, None
    
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
    else:
        logging.error(f"Run status is not completed, status: {run.status}")
        return None, None, None
    
async def process_whatsapp_message(body):
    """
    Processes an incoming WhatsApp message and generates an appropriate response.
    Args:
        body (dict): The incoming message payload from WhatsApp webhook.
    Returns:
        None
    The function extracts the WhatsApp ID, name, message, and timestamp from the incoming message payload.
    It attempts to process the message body text. If the message body is present, it generates a response
    using OpenAI integration and processes the text for WhatsApp. If the message type is audio or image,
    it sends a predefined response indicating that only text messages can be processed.
    The generated response is then sent back to the user via WhatsApp.
    """
    
    wa_id = body["entry"][0]["changes"][0]["value"]["contacts"][0]["wa_id"]
    name = body["entry"][0]["changes"][0]["value"]["contacts"][0]["profile"]["name"]
    message = body["entry"][0]["changes"][0]["value"]["messages"][0]
    
    try:
        message_body = message["text"]["body"]
    except Exception as e:
        logging.info(f"Unable to process message type: {message}")
        message_body = None
        
    if message_body:
        timestamp = body["entry"][0]["changes"][0]["value"]["messages"][0]["timestamp"]
        response_text = await generate_response(message_body, wa_id, name, timestamp)
        if response_text is None:
            return

        response_text = process_text_for_whatsapp(response_text)
    elif message.get('type') in ['audio', 'image']:
        response_text = process_text_for_whatsapp(
            "عفوًا، لا يمكنني معالجة ملفات إلا النصوص فقط. للاستفسارات، يرجى التواصل على السكرتيرة هاتفيًا على الرقم 0591066596 في أوقات الدوام الرسمية."
        )
    else:
        response_text = ""
    
    if response_text:
        send_whatsapp_message(wa_id, response_text)
        
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
            make_thread(wa_id, thread_id)
        else:
            logging.info(f"Retrieving existing thread for {name} with wa_id {wa_id}")
            thread = safe_retrieve_thread(thread_id)
        
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
            None, run_assistant, wa_id, thread, name
        )
        append_message(wa_id, 'assistant', new_message, assistant_date_str, assistant_time_str)
        return new_message
    
def log_http_response(response):
    logging.info(f"Status: {response.status_code}")
    logging.info(f"Content-type: {response.headers.get('content-type')}")
    logging.info(f"Body: {response.text}")
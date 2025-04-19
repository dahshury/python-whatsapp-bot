import logging
import asyncio
import json
import ssl
import certifi
import httpx
import inspect
from app.config import config
from openai import OpenAI
from app.utils import get_lock, check_if_thread_exists, make_thread, parse_unix_timestamp, append_message
from app.services import assistant_functions

OPENAI_API_KEY = config["OPENAI_API_KEY"]

ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

http_client = httpx.Client(verify=ssl_context)
client = OpenAI(api_key=OPENAI_API_KEY, http_client=http_client)

# Use the new Responses API (o3 model)
MODEL = "o3"
# Define available functions as tools for Responses API
FUNCTION_DEFINITIONS = [
    {
        "type": "function",
        "name": "send_business_location",
        "description": "Sends the business WhatsApp location message using the WhatsApp API. Send this message always when the user asks for the business location.",
        "parameters": {"type": "object","properties": {}, "required": [], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "get_current_datetime",
        "description": "Get the current date and time in both Hijri and Gregorian calendars. Always use this as the reference point for every message in all date-related operations. Never assume you know the current date or time without checking. Always check the current date and time before suggesting any dates or times.",
        "parameters": {"type": "object","properties": {}, "required": [], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "get_customer_reservations",
        "description": "Get the list of reservations for the user",
        "parameters": {"type": "object","properties": {"include_past": {"type": "boolean","description": "Flag to include past reservations. defaults to False."}}, "required": [], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "get_available_time_slots",
        "description": "Get the available time slots for a given date, considering vacation periods. Returns only time slots that have availability.",
        "parameters": {"type": "object","properties": {"date_str": {"type": "string","description": "Date string in ISO 8601 format 'YYYY-MM-DD' to get available time slots for. If 'hijri' is true, The input date to this function should be in the format (YYYY-MM-DD)."}, "hijri": {"type": "boolean","description": "Flag indicating if the provided input date string to this function is in Hijri format. The hijri date should be in the format (YYYY-MM-DD). defaults to False."}}, "required": ["date_str"], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "search_available_appointments",
        "description": "Get the available nearby dates for a given time slot within a specified range of days. If no time_slot is provided, returns all available time slots for each date in the range. If no start_date is provided, defaults to today.",
        "parameters": {"type": "object","properties": {"start_date": {"type": "string","description": "The date to start searching from (format: YYYY-MM-DD), defaults to today"}, "time_slot": {"type": "string","description": "The time slot to check availability for (can be 12-hour or 24-hour format). If not provided, all available time slots for each date are returned."}, "days_forward": {"type": "integer","description": "Number of days to look forward for availability, must be a non-negative integer. defaults to 7."}, "days_backward": {"type": "integer","description": "Number of days to look backward for availability, must be a non-negative integer. defaults to 0."}, "max_reservations": {"type": "integer","description": "Maximum reservations per slot. defaults to 5."}, "hijri": {"type": "boolean","description": "Flag to indicate if the provided date is in Hijri format and if output dates should be in Hijri. defaults to False."}}, "required": [], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "reserve_time_slot",
        "description": "Reserves a time slot for a customer on a specific date.",
        "parameters": {"type": "object","properties": {"customer_name": {"type": "string","description": "Name of the customer making the reservation. This is required always. Never reserve without it. Ensure it's the full name if available; otherwise, use the first and last name."}, "date_str": {"type": "string","description": "Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). This is required always. Never reserve without it. Make sure the user chooses it."}, "time_slot": {"type": "string","description": "The specific time slot the customer wants to reserve in 12-hour format (e.g., '03:30 PM'). This is required always. Never reserve without it. Make sure the user chooses it."}, "reservation_type": {"type":"integer","enum":[0,1],"description":"Type of reservation. 0 for Check-Up, 1 for Follow-Up. This is required always. Never reserve without it. Make sure the user chooses it."}, "hijri": {"type":"boolean","description":"Flag indicating if the provided input date string to this function is in Hijri format. The hijri date should be in the format (YYYY-MM-DD). This is required always. Never reserve without it. defaults to False."}}, "required":["customer_name","date_str","time_slot","reservation_type"], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "modify_reservation",
        "description": "Modify the reservation for an existing customer. Only provide the fields that are being modified.",
        "parameters": {"type": "object","properties": {"new_date": {"type":"string","description":"New date for the reservation in ISO format (YYYY-MM-DD)."}, "new_time_slot": {"type":"string","description":"New time slot (expected format: '%I:%M %p', e.g., '11:00 AM')."}, "new_name": {"type":"string","description":"New customer name."}, "new_type": {"type":"integer","description":"Reservation type (0 for Check-Up, 1 for Follow-Up)."}, "hijri": {"type":"boolean","description":"Flag indicating if the provided input date string to this function is in Hijri format. The hijri date should be in the format (YYYY-MM-DD). defaults to False."}}, "required":[], "additionalProperties": False},
        "strict": False
    },
    {
        "type": "function",
        "name": "cancel_reservation",
        "description": "Cancel a reservation for a customer. If date_str is not provided, cancel all reservations for the customer.",
        "parameters": {"type":"object","properties": {"date_str": {"type":"string","description":"Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). If not provided, all reservations are cancelled."}}, "required":[], "additionalProperties": False},
        "strict": False
    }
]

# Dynamically create FUNCTION_MAPPING functions in assistant_functions
FUNCTION_MAPPING = {
    name: func for name, func in inspect.getmembers(assistant_functions)
    if inspect.isfunction(func)
}

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
        prev_response_id = check_if_thread_exists(wa_id)
        if prev_response_id:
            logging.info(f"Continuing conversation {prev_response_id} for {name} (wa_id: {wa_id})")
        else:
            logging.info(f"Starting new conversation for {name} (wa_id: {wa_id})")
        # Append user message locally
        append_message(wa_id, 'user', message_body, date_str, time_str)
        # Call the Responses API, processing any function calls
        new_message, response_id, created_at = await asyncio.to_thread(
            run_responses, wa_id, message_body, prev_response_id, name
        )
        if not new_message:
            return None
        # Save the new response id
        make_thread(wa_id, response_id)
        # Append assistant message locally with timestamp from response
        assistant_date_str, assistant_time_str = parse_unix_timestamp(created_at)
        append_message(wa_id, 'assistant', new_message, assistant_date_str, assistant_time_str)
        return new_message

def run_responses(wa_id, user_input, previous_response_id, name):
    """Call the Responses API, handle function calls, and return final message, response id, and timestamp."""
    # initial create: wrap user input as developer message, include text & reasoning
    initial_input = [
        {
            "role": "developer",
            "content": [
                {"type": "input_text", "text": user_input}
            ]
        }
    ]
    kwargs = {
        "model": MODEL,
        "input": initial_input,
        "text": {"format": {"type": "text"}},
        "reasoning": {"effort": "high", "summary": "auto"},
        "tools": FUNCTION_DEFINITIONS,
        "store": True
    }
    if previous_response_id:
        kwargs["previous_response_id"] = previous_response_id
    response = client.responses.create(**kwargs)
    # handle any function calls
    while True:
        fc_items = [item for item in response.output if item.type == "function_call"]
        if not fc_items:
            break
        input_items = []
        for fc in fc_items:
            args = json.loads(getattr(fc, "arguments", "{}"))
            func = FUNCTION_MAPPING.get(fc.name)
            if func and 'wa_id' in inspect.signature(func).parameters:
                args['wa_id'] = wa_id
            result = func(**args) if func else {}
            input_items.append({"type":"function_call","call_id":fc.call_id,"name":fc.name,"arguments":fc.arguments})
            input_items.append({"type":"function_call_output","call_id":fc.call_id,"output":json.dumps(result)})
        # submit function call outputs
        kwargs = {
            "model": MODEL,
            "input": input_items,
            "previous_response_id": response.id,
            "tools": FUNCTION_DEFINITIONS,
            "store": True
        }
        response = client.responses.create(**kwargs)
    # extract assistant message
    msg_items = [item for item in response.output if item.type == "message" and getattr(item, "role", None) == "assistant"]
    text = None
    if msg_items:
        content = msg_items[-1].content
        text = "".join([c.text for c in content if c.type == "output_text"])
    return text, response.id, response.created_at
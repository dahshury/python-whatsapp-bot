import logging
import asyncio
import json
import ssl
import certifi
import httpx
import inspect
from app.config import config
from anthropic import Anthropic, AsyncAnthropic
from app.utils import get_lock, parse_unix_timestamp, append_message, process_text_for_whatsapp, send_whatsapp_message, retrieve_messages
from app.decorators import retry_decorator
from app.services import assistant_functions
import datetime
from zoneinfo import ZoneInfo

ANTHROPIC_API_KEY = config.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = "claude-3-7-sonnet-20250219"
SYSTEM_PROMPT = config.get("SYSTEM_PROMPT", "You are a helpful assistant.")
# Setup SSL context for secure connections
ssl_context = ssl.create_default_context()
ssl_context.load_verify_locations(certifi.where())

# Configure HTTP client with SSL context
http_client = httpx.Client(verify=ssl_context)

# Create Anthropic client
client = Anthropic(api_key=ANTHROPIC_API_KEY, http_client=http_client)

# Dynamically create FUNCTION_MAPPING functions in assistant_functions
FUNCTION_MAPPING = {
    name: func for name, func in inspect.getmembers(assistant_functions)
    if inspect.isfunction(func)
}
tools=[
                {
                "name": "modify_reservation",
                "description": "Modify the reservation for an existing customer.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "new_date": {
                            "type": "string",
                            "description": "New date for the reservation in ISO format (YYYY-MM-DD)."
                        },
                        "new_time_slot": {
                            "type": "string",
                            "description": "New time slot (expected format: '%I:%M %p', e.g., '11:00 AM')."
                        },
                        "new_name": {
                            "type": "string",
                            "description": "New customer name."
                        },
                        "new_type": {
                            "type": "integer",
                            "description": "Reservation type (0 for Check-Up, 1 for Follow-Up)."
                        }
                    },
                    "required": [
                        "new_date",
                        "new_time_slot",
                        "new_name",
                        "new_type"
                    ]
                }
            },
            {
                "name": "get_available_nearby_dates_for_time_slot",
                "description": "Get the list of available dates for the given time slot within a range of days.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "time_slot": {
                            "type": "string",
                            "description": "The time slot to check availability for in the format (expected format: %I:%M %p, e.g., 11:00 AM)"
                        },
                        "days_forward": {
                            "type": "integer",
                            "description": "Number of days to look forward for availability, must be a non-negative integer"
                        },
                        "days_backward": {
                            "type": "integer",
                            "description": "Number of days to look backward for availability, must be a non-negative integer"
                        },
                        "hijri": {
                            "type": "boolean",
                            "description": "Flag to indicate if the output dates should be converted to Hijri format"
                        }
                    },
                    "required": [
                        "time_slot",
                        "days_forward",
                        "days_backward",
                        "hijri"
                    ]
                }
            },
            {
                "name": "get_customer_reservations",
                "description": "Get the list of reservations for the user.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_available_time_slots",
                "description": "Get the available time slots for a given date.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "date_str": {
                            "type": "string",
                            "description": "Date string in ISO 8601 format 'YYYY-MM-DD' to get available time slots for. If 'hijri' is true, the date string can be in various Hijri formats such as '1447-09-10', '10 Muharram 1447', or '10, Muharram, 1447'."
                        },
                        "hijri": {
                            "type": "boolean",
                            "description": "Flag indicating if the provided date string is in Hijri format. If true, the date string can be in various Hijri formats such as '1447-09-10', '10 Muharram 1447', or '10, Muharram, 1447'."
                        }
                    },
                    "required": [
                        "date_str",
                        "hijri"
                    ]
                }
            },
            {
                "name": "cancel_reservation",
                "description": "Cancel a reservation for a customer. If date_str and time_slot are not provided, cancel all reservations for the customer.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "date_str": {
                            "type": "string",
                            "description": "Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). If not provided, all reservations are cancelled."
                        },
                        "time_slot": {
                            "type": "string",
                            "description": "The specific time slot to cancel. If not provided, all reservations for the given date are cancelled."
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "reserve_time_slot",
                "description": "Reserves a time slot for a customer on a specific date.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "wa_id": {
                            "type": "string",
                            "description": "WhatsApp ID in the format '966xxxxxxxxx' (12 digits). For example, a valid number in Saudi Arabia should start with '966' followed by the 9-digit number. If the number starts with '05xxx', you should automatically format it to the '966' prefix (e.g., '0501234567' becomes '966501234567'). If the user is reserving for themselves using the same number they are talking from, this should be an empty string ('')."
                        },
                        "customer_name": {
                            "type": "string",
                            "description": "Name of the customer making the reservation. This is required always. Never reserve without it. Ensure it's the full name if available; otherwise, use the first and last name."
                        },
                        "date_str": {
                            "type": "string",
                            "description": "Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). This is required always. Never reserve without it. Make sure the user chooses it."
                        },
                        "time_slot": {
                            "type": "string",
                            "description": "The specific time slot the customer wants to reserve in 12-hour format (e.g., '03:30 PM'). This is required always. Never reserve without it. Make sure the user chooses it."
                        },
                        "reservation_type": {
                            "type": "integer",
                            "enum": [
                                0,
                                1
                            ],
                            "description": "Type of reservation. 0 for Check-Up, 1 for Follow-Up. This is required always. Never reserve without it. Make sure the user chooses it."
                        },
                        "hijri": {
                            "type": "boolean",
                            "description": "Indicates whether the provided date is in Hijri format (True) or Gregorian format (False). This is required always. Never reserve without it."
                        }
                    },
                    "required": [
                        "customer_name",
                        "date_str",
                        "time_slot",
                        "reservation_type",
                        "hijri",
                        "wa_id"
                    ]
                }
            },
            {
                "name": "send_business_location",
                "description": "Sends the business WhatsApp location message using the WhatsApp API.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_current_datetime",
                "description": "Get the current date and time in both Hijri and Gregorian calendars.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
            ]
@retry_decorator
def run_claude(wa_id, name, tool_outputs=None):
    """
    Run Claude with the conversation history and handle tool calls.
    Returns the generated message along with date and time, or None if an error occurs.
    """
    claude_messages = retrieve_messages(wa_id)
    
    try:
        # Make request to Claude API
        response = client.beta.messages.create(
            model=CLAUDE_MODEL,
            system=SYSTEM_PROMPT,
            messages=claude_messages,
            tools=tools,
            betas=["output-128k-2025-02-19"],
            tool_choice="auto",
            max_tokens=128000,
            temperature=1
        )
        
        # Log the stop reason
        logging.info(f"Initial response stop reason: {response.stop_reason}")
        
        # Process tool calls if present - in a loop to handle multiple consecutive tool calls
        while response.stop_reason == "tool_use" and response.tool_calls:
            tool_outputs = []
            
            for tool_call in response.tool_calls:
                if tool_call.name in FUNCTION_MAPPING:
                    function = FUNCTION_MAPPING[tool_call.name]
                    sig = inspect.signature(function)
                    
                    # Parse arguments
                    parsed_args = tool_call.parameters
                    
                    # If the function takes a 'wa_id' parameter, add it
                    if 'wa_id' in sig.parameters and not parsed_args.get('wa_id', ""):
                        parsed_args['wa_id'] = wa_id
                    
                    logging.info(f"Executing tool: {tool_call.name} with args: {json.dumps(parsed_args)}")
                    
                    try:
                        # Execute the function with arguments
                        output = function(**parsed_args)
                        
                        # Log the tool output
                        logging.info(f"Tool output for {tool_call.name}: {json.dumps(output)[:500]}...")
                        
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": output
                        })
                    except Exception as e:
                        logging.error(f"Error executing function {tool_call.name}: {e}")
                        return None, None, None
                else:
                    logging.error(f"Function '{tool_call.name}' not implemented.")
                    return None, None, None
            
            # Add the assistant's response and tool outputs to the conversation history
            claude_messages.append({"role": "assistant", "content": response.content[0].text})
            
            # Format tool results for Claude API
            tool_results_message = {"role": "user", "content": []}
            for tool_output in tool_outputs:
                tool_results_message["content"].append({
                    "type": "tool_result",
                    "tool_use_id": tool_output["tool_call_id"],
                    "content": str(tool_output["output"])
                })
            
            claude_messages.append(tool_results_message)
            
            # Send follow-up with tool outputs
            response = client.beta.messages.create(
                model=CLAUDE_MODEL,
                system=SYSTEM_PROMPT,
                messages=claude_messages,
                tools=tools,
                betas=["output-128k-2025-02-19"],
                tool_choice="auto",
                max_tokens=128000,
                temperature=1
            )
            
            # Log the new stop reason
            logging.info(f"Follow-up response stop reason: {response.stop_reason}")
        
        # Get response content
        if response.content:
            new_message = response.content[0].text
            
            # Generate current timestamp
            now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M")
            
            logging.info(f"Generated message for {name}: {new_message}")
            return new_message, date_str, time_str
        else:
            logging.error("No content in Claude response")
            return None, None, None
            
    except Exception as e:
        logging.error(f"Error in Claude API call: {e}")
        return None, None, None

async def process_whatsapp_message(body):
    """
    Processes an incoming WhatsApp message and generates a response using Claude.
    Args:
        body (dict): The incoming message payload from WhatsApp webhook.
    Returns:
        None
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
    Generate a response from Claude and update the conversation.
    Uses a per-user lock to ensure that concurrent calls for the same user
    do not run simultaneously.
    """
    lock = get_lock(wa_id)
    async with lock:
        date_str, time_str = parse_unix_timestamp(timestamp)
                
        # Run Claude in an executor to avoid blocking the event loop
        new_message, assistant_date_str, assistant_time_str = await asyncio.get_event_loop().run_in_executor(
            None, run_claude, wa_id, name
        )
        
        # Append the user's message to conversation history
        append_message(wa_id, 'user', message_body)
        
        if new_message:
            append_message(wa_id, 'assistant', new_message)
        
        return new_message

def log_http_response(response):
    logging.info(f"Status: {response.status_code}")
    logging.info(f"Content-type: {response.headers.get('content-type')}")
    logging.info(f"Body: {response.text}")
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
# Create cached system prompt structure
SYSTEM_PROMPT_TEXT = config.get("SYSTEM_PROMPT", "You are a helpful assistant.")
SYSTEM_PROMPT = [
    {
        "type": "text",
        "text": SYSTEM_PROMPT_TEXT,
        "cache_control": {"type": "ephemeral"}
    }
]
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
tools = [
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
                },
                "hijri": {
                    "type": "boolean",
                    "description": "Flag indicating if the provided date string is in Hijri format."
                }
            },
            "required": [
                "new_date",
                "new_time_slot",
                "new_name",
                "new_type",
                "hijri"
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
                    "description": "Flag indicating if the provided date string is in Hijri format."
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
                    "description": "Flag indicating if the provided date string is in Hijri format."
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
        "description": "Cancel a reservation for a customer. If date_str is not provided, cancel all reservations for the customer.",
        "input_schema": {
            "type": "object",
            "properties": {
                "date_str": {
                    "type": "string",
                    "description": "Date for the reservation in ISO format (e.g., 'YYYY-MM-DD'). If not provided, all reservations are cancelled."
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
                    "description": "Flag indicating if the provided date string is in Hijri format. This is required always. Never reserve without it."
                }
            },
            "required": [
                "customer_name",
                "date_str",
                "time_slot",
                "reservation_type",
                "hijri"
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
        },
        "cache_control": {"type": "ephemeral"}
    }
]
@retry_decorator
def run_claude(wa_id, name):
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
            max_tokens=4096,
            temperature=1,
            stream=False,
            betas=["token-efficient-tools-2025-02-19"]
        )
        
        # Log the stop reason
        logging.info(f"Initial response stop reason: {response.stop_reason}")
        
        # Process tool calls if present - in a loop to handle multiple consecutive tool calls
        while response.stop_reason == "tool_use":
            logging.info("Processing tool use response")
            
            # Find the tool use block in the content
            tool_use_block = next((block for block in response.content if block.type == "tool_use"), None)
            
            if not tool_use_block:
                logging.error("Tool use indicated but no tool_use block found in content")
                break
                
            tool_name = tool_use_block.name
            tool_input = tool_use_block.input
            tool_use_id = tool_use_block.id
            
            logging.info(f"Tool used: {tool_name}")
            logging.info(f"Tool input: {json.dumps(tool_input)}")
            
            # Process the tool call
            if tool_name in FUNCTION_MAPPING:
                function = FUNCTION_MAPPING[tool_name]
                sig = inspect.signature(function)
                
                # If the function takes a 'wa_id' parameter, add it
                if 'wa_id' in sig.parameters and not tool_input.get('wa_id', ""):
                    tool_input['wa_id'] = wa_id
                
                try:
                    # Execute the function with arguments
                    if 'json_dump' in sig.parameters:
                        output = function(**tool_input, json_dump=False)
                    else:
                        output = function(**tool_input)
                    
                    # Log the tool output
                    if isinstance(output, (dict, list)):
                        logging.info(f"Tool output for {tool_name}: {json.dumps(output)[:500]}...")
                    else:
                        logging.info(f"Tool output for {tool_name}: {str(output)[:500]}...")
                    
                    # Add the assistant's response to conversation history
                    claude_messages.append({
                        "role": "assistant", 
                        "content": response.content
                    })
                    
                    # Add tool result to conversation
                    claude_messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(output) if isinstance(output, (dict, list)) else str(output)
                        }]
                    })
                    
                    # Send follow-up with tool outputs
                    response = client.beta.messages.create(
                        model=CLAUDE_MODEL,
                        system=SYSTEM_PROMPT,
                        messages=claude_messages,
                        tools=tools,
                        max_tokens=4096,
                        temperature=1,
                        stream=False,
                        betas=["token-efficient-tools-2025-02-19"]
                    )
                    
                    # Log the new stop reason
                    logging.info(f"Follow-up response stop reason: {response.stop_reason}")
                    
                except Exception as e:
                    logging.error(f"Error executing function {tool_name}: {e}")
                    
                    # Return error message to the assistant
                    claude_messages.append({
                        "role": "assistant", 
                        "content": response.content
                    })
                    
                    claude_messages.append({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": f"Error: {str(e)}"
                        }]
                    })
                    
                    # Continue the conversation despite the error
                    response = client.beta.messages.create(
                        model=CLAUDE_MODEL,
                        system=SYSTEM_PROMPT,
                        messages=claude_messages,
                        tools=tools,
                        max_tokens=4096,
                        temperature=1,
                        stream=False,
                        betas=["token-efficient-tools-2025-02-19"]
                    )
            else:
                logging.error(f"Function '{tool_name}' not implemented.")
                # Tell the assistant this tool isn't available
                claude_messages.append({
                    "role": "assistant", 
                    "content": response.content
                })
                
                claude_messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,
                        "content": f"Error: Tool '{tool_name}' is not implemented"
                    }]
                })
                
                response = client.beta.messages.create(
                    model=CLAUDE_MODEL,
                    system=SYSTEM_PROMPT,
                    messages=claude_messages,
                    tools=tools,
                    max_tokens=4096,
                    temperature=1,
                    stream=False,
                    betas=["token-efficient-tools-2025-02-19"]
                )
        
        # Get final text response
        final_response = next(
            (block.text for block in response.content if hasattr(block, "text")),
            None,
        )
        
        if final_response:
            # Generate current timestamp
            now = datetime.datetime.now(tz=ZoneInfo("Asia/Riyadh"))
            date_str = now.strftime("%Y-%m-%d")
            time_str = now.strftime("%H:%M")
            
            logging.info(f"Generated message for {name}: {final_response[:100]}...")
            return final_response, date_str, time_str
        else:
            logging.error("No text content in Claude response")
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
        
        # IMPORTANT: Save the user message BEFORE running Claude
        append_message(wa_id, 'user', message_body, date_str=date_str, time_str=time_str)
        
        # Run Claude in an executor to avoid blocking the event loop
        new_message, assistant_date_str, assistant_time_str = await asyncio.get_event_loop().run_in_executor(
            None, run_claude, wa_id, name
        )
        
        if new_message:
            append_message(wa_id, 'assistant', new_message, date_str=assistant_date_str, time_str=assistant_time_str)
        
        return new_message

def log_http_response(response):
    logging.info(f"Status: {response.status_code}")
    logging.info(f"Content-type: {response.headers.get('content-type')}")
    logging.info(f"Body: {response.text}")
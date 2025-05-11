import logging
import json
import re
import httpx
import asyncio
from app.config import config
from .logging_utils import log_http_response
from app.utils.service_utils import get_lock, parse_unix_timestamp, append_message, get_all_conversations
import inspect
from app.utils.http_client import ensure_client_healthy
from app.metrics import WHATSAPP_MESSAGE_FAILURES

async def send_whatsapp_message(wa_id, text):
    """
    Sends a text message using the WhatsApp API.
    
    Args:
        wa_id (str): The recipient's WhatsApp ID.
        text (str): The text message to be sent.
        
    Returns:
        Response: If successful, returns the response object.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
            - On timeout: ({"status": "error", "message": "Request timed out"}, 408)
            - On other errors: ({"status": "error", "message": "Failed to send message"}, 500)
    """
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": wa_id,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    }
    
    return await _send_whatsapp_request(payload, "message")


async def send_whatsapp_location(wa_id, latitude, longitude, name="", address=""):
    """
    Sends a location message using the WhatsApp API.
    
    Args:
        wa_id (str): The recipient's WhatsApp ID.
        latitude (float): The latitude of the location.
        longitude (float): The longitude of the location.
        name (str, optional): The name of the location or business.
        address (str, optional): The address of the location or business.
    
    Returns:
        dict: A dictionary indicating the status and a message.
              - On success: {"status": "success", "message": "Location sent successfully"}
              - On timeout: ({"status": "error", "message": "Request timed out"}, 408)
              - On error: ({"status": "error", "message": "Failed to send location message"}, 500)
    """
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": wa_id,
        "type": "location",
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "name": name,
            "address": address
        }
    }

    try:
        response = await _send_whatsapp_request(payload, "location message")
        
        # Check if response is an error tuple
        if isinstance(response, tuple):
            return response
            
        # Check if response is None
        if not response:
            return {"status": "error", "message": "Empty response when sending location"}, 500
            
        # Fully consume and properly close the response to avoid connection issues
        await response.aread()
        response.close()
            
        return {"status": "success", "message": "Location sent successfully"}
        
    except Exception as e:
        logging.error(f"Exception in send_whatsapp_location: {e}")
        return {"status": "error", "message": f"Failed to send location message: {str(e)}"}, 500


async def send_whatsapp_template(wa_id, template_name, language="en_US", components=None):
    """
    Sends a template message using the WhatsApp API.
    
    Args:
        wa_id (str): The recipient's WhatsApp ID.
        template_name (str): The name of the template to use.
        language (str, optional): The language of the template. Defaults to "en_US".
        components (list, optional): List of component objects containing parameters for the template.
            Example: [{"type": "body", "parameters": [{"type": "text", "text": "value"}]}]
    
    Returns:
        Response: If successful, returns the response object.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
              - On timeout: ({"status": "error", "message": "Request timed out"}, 408)
              - On error: ({"status": "error", "message": "Failed to send template"}, 500)
    """
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": wa_id,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {
                "code": language
            }
        }
    }
    
    # Add components if provided
    if components:
        payload["template"]["components"] = components
    
    return await _send_whatsapp_request(payload, "template message")


async def _send_whatsapp_request(payload, message_type):
    """
    Helper function to send WhatsApp API requests.
    
    Args:
        payload (dict): The request payload.
        message_type (str): Type of message for error logging.
        
    Returns:
        Response or tuple: Response object or error tuple.
    """
    data = json.dumps(payload)
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
    
    response = None
    try:
        # Get the global client, ensuring it's healthy
        client = await ensure_client_healthy()
        
        response = await client.post(url, content=data, headers=headers)
        response.raise_for_status()
        log_http_response(response)
        return response
        
    except httpx.TimeoutException:
        logging.error(f"Timeout occurred while sending {message_type}")
        if response:
            try:
                response.close()
            except Exception:
                pass
        return {"status": "error", "message": "Request timed out"}, 408
    except (httpx.TransportError, httpx.NetworkError, RuntimeError) as e:
        logging.error(f"Transport or network error when sending {message_type}: {e}")
        WHATSAPP_MESSAGE_FAILURES.inc()  # Track transport/network errors
        if response:
            try:
                response.close()
            except Exception:
                pass
        return {"status": "error", "message": f"Connection error when sending {message_type}"}, 500
    except httpx.RequestError as e:
        logging.error(f"Request failed when sending {message_type}: {e}")
        if response:
            try:
                response.close()
            except Exception:
                pass
        return {"status": "error", "message": f"Failed to send {message_type}"}, 500


async def process_whatsapp_message(body, run_llm_function):
    """
    Processes an incoming WhatsApp message and generates a response using the provided LLM function.
    
    Args:
        body (dict): The incoming message payload from WhatsApp webhook.
        run_llm_function (callable): The function to use for generating responses.
        
    Returns:
        None
    """
    try:
        wa_id = body["entry"][0]["changes"][0]["value"]["contacts"][0]["wa_id"]
        message = body["entry"][0]["changes"][0]["value"]["messages"][0]
        message_type = message.get('type')
        if message_type in ['audio', 'image']:
            # Handle media messages
            response_text = process_text_for_whatsapp(
                config.get('UNSUPPORTED_MEDIA_MESSAGE', "I'm sorry, I can't process audio or image files yet.")
            )
            await send_whatsapp_message(wa_id, response_text)
            
        try:
            message_body = message["text"]["body"]
        except KeyError:
            logging.info(f"Unable to process message type: {message.get('type', 'unknown')}")
            message_body = None
            
        if message_body:
            timestamp = body["entry"][0]["changes"][0]["value"]["messages"][0]["timestamp"]
            if run_llm_function is None:
                logging.error("No LLM function provided for processing message")
                return
                
            response_text = await generate_response(message_body, wa_id, timestamp, run_llm_function)
            
            # Only send a response if we got one back from the LLM
            if response_text:
                response_text = process_text_for_whatsapp(response_text)
                await send_whatsapp_message(wa_id, response_text)
            
    except Exception as e:
        logging.error(f"Error processing WhatsApp message: {e}", exc_info=True)


def process_text_for_whatsapp(text):
    """
    Process text to be compatible with WhatsApp formatting.
    
    Args:
        text (str): The text to process.
        
    Returns:
        str: Processed text with WhatsApp-compatible formatting.
    """
    # Remove content within square brackets
    text = re.sub(r"\【.*?\】", "", text).strip()
    
    # Convert markdown-style bold to WhatsApp bold
    text = re.sub(r"\*\*(.*?)\*\*", r"*\1*", text)
    
    return text


def is_valid_whatsapp_message(body):
    """
    Check if the incoming webhook event has a valid WhatsApp message structure.
    
    Args:
        body (dict): The webhook payload to validate.
        
    Returns:
        bool: True if the message has a valid structure, False otherwise.
    """
    return (
        body.get("object")
        and body.get("entry")
        and body["entry"][0].get("changes")
        and body["entry"][0]["changes"][0].get("value")
        and body["entry"][0]["changes"][0]["value"].get("messages")
        and body["entry"][0]["changes"][0]["value"]["messages"][0]
    )


async def generate_response(message_body, wa_id, timestamp, run_llm_function):
    """
    Generate a response from Claude and update the conversation.
    Uses a per-user lock to ensure that concurrent calls for the same user
    do not run simultaneously.
    
    Args:
        message_body (str): The message text from the user.
        wa_id (str): The user's WhatsApp ID.
        timestamp (int): Unix timestamp of the message.
        run_llm_function (callable): Function to generate AI responses.
        
    Returns:
        str or None: The generated response text, or None if no valid response was generated.
    """
    lock = get_lock(wa_id)
    async with lock:
        date_str, time_str = parse_unix_timestamp(timestamp)
        
        # Check for messages that might already be processed
        # Get last 5 messages to check for duplicates
        response = get_all_conversations(wa_id=wa_id, limit=5)
        if response.get("success", False):
            messages = response.get("data", {}).get(wa_id) or response.get("data", {}).get(str(wa_id), [])
            
            # Check if this message is already in the conversation history
            for msg in messages:
                if msg["role"] == "user" and msg["message"] == message_body and msg["time"] == time_str:
                    logging.warning(f"Duplicate message detected for wa_id={wa_id}: '{message_body}'. Skipping processing.")
                    return None
        
        # Save the user message BEFORE running LLM
        append_message(wa_id, 'user', message_body, date_str=date_str, time_str=time_str)
        
        # Call LLM function: async -> get coroutine, sync -> run in thread
        try:
            if inspect.iscoroutinefunction(run_llm_function):
                call = run_llm_function(wa_id)
            else:
                call = asyncio.to_thread(run_llm_function, wa_id)
            new_message, assistant_date_str, assistant_time_str = await call
            
            if new_message:
                append_message(wa_id, 'assistant', new_message, 
                              date_str=assistant_date_str, time_str=assistant_time_str)
                return new_message
            else:
                logging.warning(f"Empty or None response received from LLM for wa_id={wa_id}")
                return None
        except Exception as e:
            logging.error(f"Error generating response: {e}")
            return None
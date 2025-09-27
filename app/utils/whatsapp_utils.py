import logging
import json
import re
import httpx
import asyncio
from collections import deque
from app.config import config
from .logging_utils import log_http_response
from app.utils.service_utils import get_lock, parse_unix_timestamp, append_message, get_all_conversations
import inspect
from app.utils.http_client import ensure_client_healthy
from app.metrics import WHATSAPP_MESSAGE_FAILURES, WHATSAPP_MESSAGE_FAILURES_BY_REASON

# In-memory LRU of recently processed WhatsApp message IDs to avoid duplicate processing
_recent_message_ids_queue: deque[str] = deque(maxlen=1000)
_recent_message_ids_set = set()

async def send_typing_indicator(message_id: str, indicator_type: str = "text", mark_read: bool = True):
    """
    Send a typing indicator for a received WhatsApp message (optionally marking it as read).

    The indicator auto-dismisses when a reply is sent or after ~25 seconds.

    Args:
        message_id: Incoming WhatsApp message id (messages[0].id from webhook).
        indicator_type: Indicator content type, e.g. "text".
        mark_read: Whether to include status=read for the message id.

    Returns:
        Response or tuple: Response object or error tuple.
    """
    try:
        if not message_id or not isinstance(message_id, str):
            return {"status": "error", "message": "Invalid message_id"}, 400

        payload = {
            "messaging_product": "whatsapp",
            "message_id": message_id,
            "typing_indicator": {"type": indicator_type},
        }
        if mark_read:
            payload["status"] = "read"

        return await _send_whatsapp_request(payload, "typing indicator")
    except Exception as e:
        logging.error(f"Failed to send typing indicator: {e}")
        return {"status": "error", "message": "Failed to send typing indicator"}, 500

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
            WHATSAPP_MESSAGE_FAILURES.inc()  # Track any response failures
            try:
                WHATSAPP_MESSAGE_FAILURES_BY_REASON.labels(
                    reason="empty_response", message_type="location",
                ).inc()
            except Exception:
                pass
            return {"status": "error", "message": "Empty response when sending location"}, 500
            
        # Fully consume the response but don't close it
        await response.aread()
        # Don't explicitly close the response to keep the connection alive
        # for subsequent requests (managed by the HTTP client)
            
        return {"status": "success", "message": "Location sent successfully"}
        
    except Exception as e:
        logging.error(f"Exception in send_whatsapp_location: {e}")
        WHATSAPP_MESSAGE_FAILURES.inc()
        try:
            WHATSAPP_MESSAGE_FAILURES_BY_REASON.labels(
                reason=e.__class__.__name__ or "exception", message_type="location",
            ).inc()
        except Exception:
            pass
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
    
    # Check for missing configuration
    if not config.get('ACCESS_TOKEN'):
        logging.error("WhatsApp ACCESS_TOKEN is missing from configuration")
        return {"status": "error", "message": "Missing ACCESS_TOKEN"}, 500
    
    if not config.get('PHONE_NUMBER_ID'):
        logging.error("WhatsApp PHONE_NUMBER_ID is missing from configuration")
        return {"status": "error", "message": "Missing PHONE_NUMBER_ID"}, 500
    
    if not config.get('VERSION'):
        logging.error("WhatsApp API VERSION is missing from configuration")
        return {"status": "error", "message": "Missing VERSION"}, 500
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
    
    logging.debug(f"WhatsApp API request URL: {url}")
    logging.debug(f"WhatsApp API payload: {data[:200]}..." if len(data) > 200 else f"WhatsApp API payload: {data}")
    
    response = None
    try:
        # Get the global client, ensuring it's healthy
        client = await ensure_client_healthy()
        
        response = await client.post(url, content=data, headers=headers)
        
        # Check for HTTP errors and log WhatsApp API error details
        if response.status_code >= 400:
            try:
                error_body = response.json()
                logging.error(f"WhatsApp API error {response.status_code} when sending {message_type}: {error_body}")
                try:
                    title = None
                    if isinstance(error_body, dict):
                        title = error_body.get("error", {}).get("type") or error_body.get("error", {}).get("subcode") or error_body.get("error", {}).get("message")
                    WHATSAPP_MESSAGE_FAILURES_BY_REASON.labels(
                        reason=str(title or f"http_{response.status_code}"), message_type=str(message_type),
                    ).inc()
                except Exception:
                    pass
            except (ValueError, TypeError):
                logging.error(f"WhatsApp API error {response.status_code} when sending {message_type}: {response.text}")
                try:
                    WHATSAPP_MESSAGE_FAILURES_BY_REASON.labels(
                        reason=f"http_{response.status_code}", message_type=str(message_type),
                    ).inc()
                except Exception:
                    pass
            
            # Return error tuple instead of raising exception to prevent retries
            return {"status": "error", "message": f"WhatsApp API error {response.status_code}"}, response.status_code
        
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
        WHATSAPP_MESSAGE_FAILURES.inc()
        try:
            WHATSAPP_MESSAGE_FAILURES_BY_REASON.labels(
                reason=e.__class__.__name__ or "network_error", message_type=str(message_type),
            ).inc()
        except Exception:
            pass
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


async def mark_message_as_read(message_id: str):
    """
    Mark a specific WhatsApp message as read.

    Args:
        message_id (str): The WhatsApp message ID (messages[0].id from webhook).

    Returns:
        Response or tuple: Response object on success, or (json, status_code) tuple on error.
    """
    try:
        if not message_id or not isinstance(message_id, str):
            return {"status": "error", "message": "Invalid message_id"}, 400

        # Validate config quickly, reuse same endpoint as sending messages
        if not config.get('ACCESS_TOKEN') or not config.get('PHONE_NUMBER_ID') or not config.get('VERSION'):
            return {"status": "error", "message": "Missing WhatsApp API configuration"}, 500

        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }

        data = json.dumps(payload)
        headers = {
            "Content-type": "application/json",
            "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
        }
        url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"

        client = await ensure_client_healthy()
        response = await client.post(url, content=data, headers=headers)

        if response.status_code >= 400:
            try:
                err = response.json()
                logging.warning(f"WhatsApp mark-as-read failed {response.status_code}: {err}")
            except Exception:
                logging.warning(f"WhatsApp mark-as-read failed {response.status_code}: {response.text}")
            return {"status": "error", "message": f"WhatsApp API error {response.status_code}"}, response.status_code

        log_http_response(response)
        return response

    except httpx.TimeoutException:
        logging.error("Timeout while marking message as read")
        return {"status": "error", "message": "Request timed out"}, 408
    except (httpx.TransportError, httpx.NetworkError, RuntimeError) as e:
        logging.error(f"Transport error while marking message as read: {e}")
        return {"status": "error", "message": "Connection error"}, 500
    except httpx.RequestError as e:
        logging.error(f"Request error while marking message as read: {e}")
        return {"status": "error", "message": "Failed to mark as read"}, 500

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
        message_id = message.get("id")

        # Idempotency: skip already processed message IDs (Meta may deliver duplicates)
        if message_id:
            if message_id in _recent_message_ids_set:
                logging.warning(f"Duplicate delivery detected for message_id={message_id}. Skipping.")
                return
            _recent_message_ids_queue.append(message_id)
            _recent_message_ids_set.add(message_id)
            # Trim set to queue size if needed
            while len(_recent_message_ids_set) > _recent_message_ids_queue.maxlen:
                evicted = _recent_message_ids_queue.popleft()
                _recent_message_ids_set.discard(evicted)
        message_type = message.get('type')
        if message_type in ['audio', 'image']:
            # Handle media messages
            response_text = process_text_for_whatsapp(
                config.get('UNSUPPORTED_MEDIA_MESSAGE', "I'm sorry, I can't process audio or image files yet.")
            )
            try:
                result = await send_whatsapp_message(wa_id, response_text)
                if isinstance(result, tuple):
                    logging.error(f"WhatsApp unsupported media message sending failed: {result[0]}")
                else:
                    logging.info(f"WhatsApp unsupported media message sent successfully to {wa_id}")
            except Exception as e:
                logging.error(f"Exception while sending unsupported media message to {wa_id}: {e}", exc_info=True)
            
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
            # Display typing indicator while we prepare the response
            try:
                lock = get_lock(wa_id)
                if not lock.locked():
                    await send_typing_indicator(message_id)
            except Exception:
                pass
                
            response_text = await generate_response(message_body, wa_id, timestamp, run_llm_function)
            
            # Only send a response if we got one back from the LLM
            if response_text:
                response_text = process_text_for_whatsapp(response_text)
                try:
                    result = await send_whatsapp_message(wa_id, response_text)
                    # Log non-2xx responses and continue gracefully
                    if isinstance(result, tuple):
                        logging.warning(f"WhatsApp send returned error: {result}")
                    else:
                        logging.info(f"WhatsApp message sent successfully to {wa_id}")
                except Exception as e:
                    # Don't let WhatsApp sending failures trigger LLM retries
                    logging.error(f"Exception while sending WhatsApp message to {wa_id}: {e}", exc_info=True)
            
    except Exception as e:
        logging.error(f"Error processing WhatsApp message: {e}", exc_info=True)


async def test_whatsapp_api_config():
    """
    Test WhatsApp API configuration by sending a minimal request.
    Returns tuple: (success: bool, message: str, details: dict)
    """
    try:
        # Basic configuration check
        required_configs = ['ACCESS_TOKEN', 'PHONE_NUMBER_ID', 'VERSION']
        missing = [key for key in required_configs if not config.get(key)]
        if missing:
            return False, f"Missing configuration: {', '.join(missing)}", {}
        
        # Test payload - minimal valid request
        test_payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual", 
            "to": "000000000000",  # Invalid number that should fail gracefully
            "type": "text",
            "text": {"body": "test"}
        }
        
        data = json.dumps(test_payload)
        headers = {
            "Content-type": "application/json",
            "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
        }
        url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
        
        client = await ensure_client_healthy()
        response = await client.post(url, content=data, headers=headers)
        
        details = {
            "status_code": response.status_code,
            "url": url,
            "phone_number_id": config['PHONE_NUMBER_ID'],
            "version": config['VERSION']
        }
        
        try:
            response_body = response.json()
            details["response"] = response_body
        except (ValueError, TypeError):
            details["response"] = response.text
        
        if response.status_code == 400:
            # Expected for invalid phone number - this means auth is working
            if "Invalid phone number" in str(details.get("response", "")):
                return True, "WhatsApp API configuration is valid (auth working)", details
        elif response.status_code == 401:
            return False, "WhatsApp API authentication failed - check ACCESS_TOKEN", details
        elif response.status_code == 403:
            return False, "WhatsApp API access forbidden - check business verification", details
        elif response.status_code == 404:
            return False, "WhatsApp API endpoint not found - check PHONE_NUMBER_ID/VERSION", details
        
        return False, f"Unexpected WhatsApp API response: {response.status_code}", details
        
    except Exception as e:
        return False, f"WhatsApp API test failed: {str(e)}", {"error": str(e)}


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
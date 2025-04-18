import logging
import json
import re
import requests
from app.config import config
from .logging_utils import log_http_response
import asyncio
from app.utils.service_utils import get_lock, parse_unix_timestamp, append_message

def send_whatsapp_message(wa_id, text):
    """
    Sends a text message using the WhatsApp API.
    Args:
        recipient (str): The recipient's WhatsApp ID.
        text (str): The text message to be sent.
    Returns:
        Response: If the request is successful, returns the response object from the requests library.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
            - On timeout, returns ({"status": "error", "message": "Request timed out"}, 408).
            - On other request exceptions, returns ({"status": "error", "message": "Failed to send message"}, 500).
    Raises:
        requests.HTTPError: If the HTTP request returned an unsuccessful status code.
    """
    data = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": wa_id,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    })
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
        
    except requests.Timeout:
        logging.error("Timeout occurred while sending message")
        return {"status": "error", "message": "Request timed out"}, 408
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return {"status": "error", "message": "Failed to send message"}, 500
    else:
        log_http_response(response)
        return response
    
def send_whatsapp_location(wa_id, latitude, longitude, name="", address=""):
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
              - On request exception: ({"status": "error", "message": "Failed to send location message"}, 500)
    
    Raises:
        requests.HTTPError: If the HTTP request returns an unsuccessful status code.
    """
    data = json.dumps({
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
    })

    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"

    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.Timeout:
        logging.error("Timeout occurred while sending location message")
        return {"status": "error", "message": "Request timed out"}, 408
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return {"status": "error", "message": "Failed to send location message"}, 500
    else:
        log_http_response(response)
        return {"status": "success", "message": "Location sent successfully"}

def send_whatsapp_template(wa_id, template_name, language="en_US", components=None):
    """
    Sends a template message using the WhatsApp API.
    
    Args:
        wa_id (str): The recipient's WhatsApp ID.
        template_name (str): The name of the template to use.
        language (str, optional): The language of the template. Defaults to "en_US".
        components (list, optional): List of component objects containing parameters for the template.
            Example: [{"type": "body", "parameters": [{"type": "text", "text": "value"}]}]
    
    Returns:
        Response: If the request is successful, returns the response object from the requests library.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
              - On timeout: ({"status": "error", "message": "Request timed out"}, 408)
              - On request exception: ({"status": "error", "message": "Failed to send template"}, 500)
    
    Raises:
        requests.HTTPError: If the HTTP request returns an unsuccessful status code.
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
    
    data = json.dumps(payload)
    
    headers = {
        "Content-type": "application/json",
        "Authorization": f"Bearer {config['ACCESS_TOKEN']}",
    }
    url = f"https://graph.facebook.com/{config['VERSION']}/{config['PHONE_NUMBER_ID']}/messages"
    
    try:
        response = requests.post(url, data=data, headers=headers, timeout=10)
        response.raise_for_status()
        
    except requests.Timeout:
        logging.error("Timeout occurred while sending template message")
        return {"status": "error", "message": "Request timed out"}, 408
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return {"status": "error", "message": "Failed to send template"}, 500
    else:
        log_http_response(response)
        return response

async def process_whatsapp_message(body, run_llm_function):
    """
    Processes an incoming WhatsApp message and generates a response using the provided LLM function.
    Args:
        body (dict): The incoming message payload from WhatsApp webhook.
        run_llm_function (callable, optional): The function to use for generating responses. Defaults to None.
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
        if run_llm_function is None:
            logging.error("No LLM function provided for processing message")
            return
        response_text = await generate_response(message_body, wa_id, name, timestamp, run_llm_function)
        if response_text is None:
            return

        response_text = process_text_for_whatsapp(response_text)
    elif message.get('type') in ['audio', 'image']:
        response_text = process_text_for_whatsapp(
            config.get('UNSUPPORTED_MEDIA_MESSAGE', "")
        )
    else:
        response_text = ""
    
    if response_text:
        send_whatsapp_message(wa_id, response_text)

def process_text_for_whatsapp(text):
    pattern = r"\【.*?\】"
    text = re.sub(pattern, "", text).strip()
    pattern = r"\*\*(.*?)\*\*"
    replacement = r"*\1*"
    whatsapp_style_text = re.sub(pattern, replacement, text)
    return whatsapp_style_text

def is_valid_whatsapp_message(body):
    """
    Check if the incoming webhook event has a valid WhatsApp message structure.
    """
    return (
        body.get("object")
        and body.get("entry")
        and body["entry"][0].get("changes")
        and body["entry"][0]["changes"][0].get("value")
        and body["entry"][0]["changes"][0]["value"].get("messages")
        and body["entry"][0]["changes"][0]["value"]["messages"][0]
    )

async def generate_response(message_body, wa_id, name, timestamp, run_llm_function):
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
        # Using run_claude directly bypasses the decorator, so we need to call it properly
        new_message, assistant_date_str, assistant_time_str = await asyncio.to_thread(run_llm_function, wa_id, name)
        
        if new_message:
            append_message(wa_id, 'assistant', new_message, date_str=assistant_date_str, time_str=assistant_time_str)
        
        return new_message
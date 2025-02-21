import logging
import json
import re
import requests
from app.services.openai_service import generate_response
from app.config import config


def log_http_response(response):
    logging.info(f"Status: {response.status_code}")
    logging.info(f"Content-type: {response.headers.get('content-type')}")
    logging.info(f"Body: {response.text}")


def get_text_message_input(recipient, text):
    return json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": recipient,
        "type": "text",
        "text": {"preview_url": False, "body": text},
    })

def send_message(data):
    """
    Sends a message using the WhatsApp API.
    This function sends a message to a specified phone number using the WhatsApp API provided by Facebook. 
    It constructs the necessary headers and URL, and handles potential exceptions that may occur during the request.
    Args:
        data (dict): The message payload to be sent in JSON format.
    Returns:
        Response: If the request is successful, returns the response object from the requests library.
        tuple: If an error occurs, returns a tuple containing a JSON response and an HTTP status code.
            - On timeout, returns ({"status": "error", "message": "Request timed out"}, 408).
            - On other request exceptions, returns ({"status": "error", "message": "Failed to send message"}, 500).
    Raises:
        requests.HTTPError: If the HTTP request returned an unsuccessful status code.
    """
    
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


def process_text_for_whatsapp(text):
    pattern = r"\【.*?\】"
    text = re.sub(pattern, "", text).strip()
    pattern = r"\*\*(.*?)\*\*"
    replacement = r"*\1*"
    whatsapp_style_text = re.sub(pattern, replacement, text)
    return whatsapp_style_text


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
        data = get_text_message_input(wa_id, response_text)
        send_message(data)


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
